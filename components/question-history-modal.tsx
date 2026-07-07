import { Ionicons } from '@expo/vector-icons';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { QAFields } from '@/components/qa-fields';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useEpisodeQuestions } from '@/hooks/use-episode-questions';
import { EpisodeQuestion } from '@/services/api';

interface Props {
  visible: boolean;
  episodeId: string | null;
  onClose: () => void;
}

/** Ledger of all questions the user asked in this episode. Tapping an entry
 * shows the full question and answer; back returns to the list, ✕ (or tapping
 * outside) returns to the player. */
export function QuestionHistoryModal({ visible, episodeId, onClose }: Props) {
  const { t, i18n } = useTranslation();
  const { questions, loading, error } = useEpisodeQuestions(episodeId, visible);
  const [selected, setSelected] = useState<EpisodeQuestion | null>(null);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(i18n.language, { month: 'short', day: 'numeric' });

  const handleClose = useCallback(() => {
    setSelected(null);
    onClose();
  }, [onClose]);

  // Android back: step back to the list first, then out of the modal.
  const handleRequestClose = useCallback(() => {
    if (selected) {
      setSelected(null);
    } else {
      handleClose();
    }
  }, [selected, handleClose]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleRequestClose}
    >
      {/* Backdrop is a sibling behind the card (not a wrapping Pressable):
          a pressable ancestor steals drag gestures from the ScrollView/FlatList. */}
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        <View style={styles.card}>
          <View style={styles.header}>
            {selected ? (
              <Pressable style={styles.backButton} onPress={() => setSelected(null)} hitSlop={12}>
                <Ionicons name="chevron-back" size={18} color={Colors.cyan} />
                <ThemedText style={styles.backText}>{t('common.back')}</ThemedText>
              </Pressable>
            ) : (
              <ThemedText style={styles.title}>{t('qa.historyTitle')}</ThemedText>
            )}
            <Pressable onPress={handleClose} hitSlop={12}>
              <ThemedText style={styles.close}>✕</ThemedText>
            </Pressable>
          </View>

          {selected ? (
            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
              <ThemedText style={styles.askedAt}>
                {t('qa.askedAt', { date: formatDate(selected.created_at) })}
              </ThemedText>
              <QAFields question={selected.question} answer={selected.answer} />
            </ScrollView>
          ) : loading ? (
            <ActivityIndicator color={Colors.cyan} style={styles.placeholder} />
          ) : error ? (
            <ThemedText style={styles.placeholderText}>{t('qa.historyError')}</ThemedText>
          ) : questions.length === 0 ? (
            <ThemedText style={styles.placeholderText}>{t('qa.historyEmpty')}</ThemedText>
          ) : (
            <FlatList
              style={styles.body}
              data={questions}
              keyExtractor={(item) => item.id}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <Pressable style={styles.row} onPress={() => setSelected(item)}>
                  <ThemedText style={styles.rowDate}>{formatDate(item.created_at)}</ThemedText>
                  <ThemedText style={styles.rowQuestion} numberOfLines={2}>
                    {item.question}
                  </ThemedText>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
                </Pressable>
              )}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.sm,
    padding: Spacing.xxl,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 17,
    fontWeight: 'bold',
    color: Colors.textPrimary,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  backText: {
    fontSize: 15,
    color: Colors.cyan,
  },
  close: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  body: {
    // flexShrink lets the ScrollView/FlatList shrink to the card's maxHeight
    // instead of being laid out at full content height (which clips without
    // ever becoming scrollable).
    flexGrow: 0,
    flexShrink: 1,
  },
  askedAt: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  placeholder: {
    marginVertical: Spacing.xl,
  },
  placeholderText: {
    fontSize: 15,
    color: Colors.textSecondary,
    marginVertical: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowDate: {
    fontSize: 13,
    color: Colors.cyan,
    minWidth: 48,
  },
  rowQuestion: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
});
