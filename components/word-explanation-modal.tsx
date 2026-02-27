import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getPosColor, getPosLabel } from '@/constants/pos';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { WordExplanation } from '@/services/api';

interface Props {
  word: WordExplanation | null;
  targetLanguage?: string;
  onClose: () => void;
}

function Field({ label, value, italic }: { label: string; value: string; italic?: boolean }) {
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
  const posLabel = word ? getPosLabel(word.pos, targetLanguage ?? 'en') : null;
  const posColor = word ? getPosColor(word.pos) : '#94a3b8';

  return (
    <Modal
      visible={!!word}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          {word && (
            <>
              <View style={styles.header}>
                <View>
                  <ThemedText style={styles.surface}>{word.surface}</ThemedText>
                  {(word.pos === 'VERB' || word.pos === 'AUX') && word.lemma && (
                    <ThemedText style={styles.lemma}>{word.lemma}</ThemedText>
                  )}
                  {posLabel && (
                    <View style={[styles.posBadge, { backgroundColor: posColor + '20' }]}>
                      <ThemedText style={[styles.posBadgeText, { color: posColor }]}>
                        {posLabel}
                      </ThemedText>
                    </View>
                  )}
                </View>
                <Pressable onPress={onClose} hitSlop={12}>
                  <ThemedText style={styles.close}>✕</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <Field label="Translation" value={word.translation} />
                <Field label="Meaning" value={word.meaning} />
                <Field label="Pattern" value={word.pattern} />
                <Field label="Usage notes" value={word.usage_notes} />
                <Field label="Example" value={word.example} italic />
              </ScrollView>
            </>
          )}
        </View>
      </Pressable>
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
    flexGrow: 0,
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
  posBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  posBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
