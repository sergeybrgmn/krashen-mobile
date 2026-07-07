import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { QAFields } from '@/components/qa-fields';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { AskResponse } from '@/services/api';

interface Props {
  result: AskResponse | null;
  onClose: () => void;
}

/** Shows the answer to a just-asked question. Dismiss by tapping outside or ✕;
 * past answers stay reachable through the Q&A history modal. */
export function AnswerModal({ result, onClose }: Props) {
  return (
    <Modal
      visible={!!result}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      {/* Backdrop is a sibling behind the card (not a wrapping Pressable):
          a pressable ancestor steals drag gestures from the ScrollView. */}
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.card}>
          {result && (
            <>
              <View style={styles.header}>
                <Pressable onPress={onClose} hitSlop={12}>
                  <ThemedText style={styles.close}>✕</ThemedText>
                </Pressable>
              </View>
              <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
                <QAFields question={result.question} answer={result.answer} />
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
    justifyContent: 'flex-end',
    marginBottom: Spacing.md,
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
});
