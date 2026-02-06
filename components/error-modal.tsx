import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  message: string;
  isAuth: boolean;
  onDismiss: () => void;
  onSignIn: () => void;
}

export function ErrorModal({ visible, message, isAuth, onDismiss, onSignIn }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ThemedText style={styles.message}>{message}</ThemedText>

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onDismiss}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>

            {isAuth ? (
              <Pressable style={styles.primaryButton} onPress={onSignIn}>
                <ThemedText style={styles.primaryText}>Sign in</ThemedText>
              </Pressable>
            ) : (
              <Pressable style={styles.primaryButton} onPress={onDismiss}>
                <ThemedText style={styles.primaryText}>OK</ThemedText>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.sm,
    padding: Spacing.xxl,
  },
  message: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textPrimary,
    marginBottom: Spacing.xl,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
  },
  cancelButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelText: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  primaryButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cyan,
  },
  primaryText: {
    color: Colors.black,
    fontSize: 15,
    fontWeight: '600',
  },
});
