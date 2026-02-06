import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { WordExplanation } from '@/services/api';

interface Props {
  word: WordExplanation | null;
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

export function WordExplanationModal({ word, onClose }: Props) {
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
                <ThemedText style={styles.surface}>{word.surface}</ThemedText>
                <Pressable onPress={onClose} hitSlop={12}>
                  <ThemedText style={styles.close}>✕</ThemedText>
                </Pressable>
              </View>

              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <Field label="Translation" value={word.translation} />
                <Field label="Part of speech" value={word.pos} />
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
});
