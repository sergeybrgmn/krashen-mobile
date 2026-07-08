import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getPosColor, getPosLabel } from '@/constants/pos';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { WordExplanation, WordToken } from '@/services/api';

interface Props {
  word: WordExplanation | null;
  targetLanguage?: string;
  onClose: () => void;
}

interface PosBadge {
  pos: string;
  label: string;
  color: string;
}

// One badge per token, skipping unlabeled POS (punctuation etc.) and collapsing
// consecutive repeats ("Estados Unidos" is one "Proper noun", not two).
function getPosBadges(tokens: WordToken[], language: string): PosBadge[] {
  const badges: PosBadge[] = [];
  for (const token of tokens) {
    const label = getPosLabel(token.pos, language);
    if (!label) continue;
    if (badges.length > 0 && badges[badges.length - 1].pos === token.pos) continue;
    badges.push({ pos: token.pos, label, color: getPosColor(token.pos) });
  }
  return badges;
}

// Dictionary forms worth showing: verb tokens whose lemma differs from the
// surface; skips infinitives that already match the text. A single word shows
// the bare lemma ("dar" under "dio"); inside a multi-word expression each lemma
// is prefixed with its surface ("coleando → colear") so it's clear which word
// it belongs to.
function getVerbLemmas(tokens: WordToken[]): string[] {
  return tokens
    .filter(
      (t) =>
        (t.pos === 'VERB' || t.pos === 'AUX') &&
        t.lemma.toLowerCase() !== t.surface.toLowerCase(),
    )
    .map((t) => (tokens.length > 1 ? `${t.surface} → ${t.lemma}` : t.lemma));
}

function Field({ label, value, italic }: { label: string; value: string | null; italic?: boolean }) {
  if (!value) return null;
  return (
    <View style={styles.field}>
      <ThemedText style={styles.fieldLabel}>{label}</ThemedText>
      <ThemedText style={[styles.fieldValue, italic && styles.italic]}>
        {value}
      </ThemedText>
    </View>
  );
}

export function WordExplanationModal({ word, targetLanguage, onClose }: Props) {
  const { t } = useTranslation();
  const posBadges = word ? getPosBadges(word.tokens, targetLanguage ?? 'en') : [];
  const verbLemmas = word ? getVerbLemmas(word.tokens) : [];

  return (
    <Modal
      visible={!!word}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop is a sibling behind the card (not a wrapping Pressable):
          a pressable ancestor steals drag gestures from the ScrollView. */}
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          {word && (
            <>
              <View style={styles.header}>
                <View style={styles.headerLeft}>
                  <ThemedText style={styles.surface}>{word.surface}</ThemedText>
                  {verbLemmas.length > 0 && (
                    <ThemedText style={styles.lemma}>{verbLemmas.join(', ')}</ThemedText>
                  )}
                  {posBadges.length > 0 && (
                    <View style={styles.posBadges}>
                      {posBadges.map((badge, i) => (
                        <View
                          key={`${badge.pos}-${i}`}
                          style={[styles.posBadge, { backgroundColor: badge.color + '20' }]}
                        >
                          <ThemedText style={[styles.posBadgeText, { color: badge.color }]}>
                            {badge.label}
                          </ThemedText>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <ThemedText style={styles.close}>✕</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <Field label={t('wordModal.translation')} value={word.translation} />
                <Field label={t('wordModal.meaning')} value={word.meaning} />
                <Field label={t('wordModal.pattern')} value={word.pattern} />
                <Field label={t('wordModal.usageNotes')} value={word.usage_notes} />
                <Field label={t('wordModal.example')} value={word.example} italic />
              </ScrollView>
            </>
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
  headerLeft: {
    flexShrink: 1,
  },
  surface: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.cyan,
  },
  lemma: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  close: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  body: {
    // flexShrink lets the ScrollView shrink to the card's maxHeight instead of
    // being laid out at full content height (which clips without ever becoming
    // scrollable).
    flexGrow: 0,
    flexShrink: 1,
  },
  field: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 2,
  },
  fieldValue: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
  },
  italic: {
    fontStyle: 'italic',
  },
  posBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  posBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  posBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
