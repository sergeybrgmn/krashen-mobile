import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { WordExplanationModal } from '@/components/word-explanation-modal';
import { Colors, Spacing } from '@/constants/theme';
import { useAuthToken } from '@/hooks/use-auth-token';
import { SavedWord, SavedWordsPage, deleteSavedWord, fetchSavedWords } from '@/services/api';
import { posthog } from '@/services/analytics';

const PAGE_SIZE = 50;

export default function VocabularyScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const getToken = useAuthToken();

  const [items, setItems] = useState<SavedWord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [selected, setSelected] = useState<SavedWord | null>(null);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    posthog?.capture('vocabulary_opened');
  }, []);

  // Debounce keystrokes so we don't hit the API on every character.
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => clearTimeout(handle);
  }, [query]);

  const fetchPage = useCallback(
    async (offset: number): Promise<SavedWordsPage | null> => {
      const token = await getToken();
      if (!token) return null;
      return fetchSavedWords(token, {
        limit: PAGE_SIZE,
        offset,
        q: debouncedQuery || undefined,
      });
    },
    [getToken, debouncedQuery],
  );

  // Initial load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const page = await fetchPage(0);
        if (cancelled || !page) return;
        setItems(page.items);
        setTotal(page.total);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const handleEndReached = useCallback(() => {
    if (loading || loadingMore || refreshing) return;
    if (items.length >= total) return;
    setLoadingMore(true);
    (async () => {
      try {
        const page = await fetchPage(items.length);
        if (page) {
          setItems((prev) => [...prev, ...page.items]);
          setTotal(page.total);
        }
      } catch {
        // Ignore pagination errors; pull-to-refresh recovers.
      } finally {
        setLoadingMore(false);
      }
    })();
  }, [loading, loadingMore, refreshing, items.length, total, fetchPage]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    (async () => {
      try {
        const page = await fetchPage(0);
        if (page) {
          setItems(page.items);
          setTotal(page.total);
          setError(false);
        }
      } catch {
        setError(true);
      } finally {
        setRefreshing(false);
      }
    })();
  }, [fetchPage]);

  const handleDelete = useCallback(
    async (item: SavedWord) => {
      const token = await getToken();
      if (!token) return;
      try {
        await deleteSavedWord(token, item.id);
        setItems((prev) => prev.filter((w) => w.id !== item.id));
        setTotal((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.warn('Failed to delete saved word', e);
      }
    },
    [getToken],
  );

  const renderItem = useCallback(
    ({ item }: { item: SavedWord }) => (
      <Pressable style={styles.row} onPress={() => setSelected(item)}>
        <View style={styles.rowContent}>
          <ThemedText style={styles.surface}>{item.card.surface}</ThemedText>
          <ThemedText style={styles.translation} numberOfLines={1}>
            {item.card.translation ?? item.card.meaning}
          </ThemedText>
          {item.episode_title ? (
            <ThemedText style={styles.episodeTitle} numberOfLines={1}>
              {item.episode_title}
            </ThemedText>
          ) : null}
        </View>
        <Pressable
          onPress={() => handleDelete(item)}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('vocabulary.delete')}
        >
          <Ionicons name="trash-outline" size={20} color={Colors.textMuted} />
        </Pressable>
      </Pressable>
    ),
    [handleDelete, t],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.cyan} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.title}>
          {t('vocabulary.title')}
        </ThemedText>
      </View>

      {(total > 0 || query !== '' || loading) && (
        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={t('vocabulary.searchPlaceholder')}
            placeholderTextColor={Colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query !== '' && (
            <Pressable
              onPress={() => setQuery('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={t('vocabulary.clearSearch')}
            >
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </Pressable>
          )}
        </View>
      )}

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={Colors.cyan} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centerFill}>
          <ThemedText style={styles.errorText}>{t('vocabulary.error')}</ThemedText>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.centerFill}>
          {debouncedQuery ? (
            <ThemedText style={styles.emptyTitle}>{t('vocabulary.noMatches')}</ThemedText>
          ) : (
            <>
              <ThemedText style={styles.emptyTitle}>{t('vocabulary.empty')}</ThemedText>
              <ThemedText style={styles.emptyHint}>{t('vocabulary.emptyHint')}</ThemedText>
            </>
          )}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={Colors.cyan}
            />
          }
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator color={Colors.cyan} style={styles.footer} />
            ) : null
          }
        />
      )}

      <WordExplanationModal
        word={selected?.card ?? null}
        targetLanguage={selected?.target_language}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  backButton: {
    marginLeft: -Spacing.xs,
  },
  title: {
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.xl,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 10,
    backgroundColor: Colors.cardSolid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  errorText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  emptyHint: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: 40,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowContent: {
    flex: 1,
  },
  surface: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  translation: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  episodeTitle: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  footer: {
    paddingVertical: Spacing.lg,
  },
});
