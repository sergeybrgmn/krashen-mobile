import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getLanguageName } from '@/constants/languages';
import { Colors, Radii, Spacing } from '@/constants/theme';

interface Props {
  visible: boolean;
  title: string;
  options: string[];
  initial?: string | null;
  onConfirm: (lang: string) => void;
  onCancel: () => void;
}

const SCROLL_THRESHOLD = 8;

export function LanguageChoiceModal({
  visible,
  title,
  options,
  initial,
  onConfirm,
  onCancel,
}: Props) {
  const [selected, setSelected] = useState<string>(
    initial && options.includes(initial) ? initial : options[0] ?? 'en',
  );

  useEffect(() => {
    if (visible) {
      setSelected(initial && options.includes(initial) ? initial : options[0] ?? 'en');
    }
  }, [visible, initial, options]);

  const needsScroll = options.length > SCROLL_THRESHOLD;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ThemedText type="subtitle" style={styles.title}>
            {title}
          </ThemedText>

          <View style={needsScroll ? styles.optionsScrollWrap : undefined}>
            <ScrollView
              style={needsScroll ? styles.optionsScroll : undefined}
              contentContainerStyle={styles.options}
              showsVerticalScrollIndicator={needsScroll}
            >
              {options.map((code) => (
                <Pressable
                  key={code}
                  style={[styles.option, selected === code && styles.optionSelected]}
                  onPress={() => setSelected(code)}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      selected === code && styles.optionTextSelected,
                    ]}
                  >
                    {getLanguageName(code)}
                  </ThemedText>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.buttons}>
            <Pressable style={styles.cancelButton} onPress={onCancel}>
              <ThemedText style={styles.cancelText}>Cancel</ThemedText>
            </Pressable>
            <Pressable
              style={styles.confirmButton}
              onPress={() => onConfirm(selected)}
            >
              <ThemedText style={styles.confirmText}>Confirm</ThemedText>
            </Pressable>
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
  title: {
    marginBottom: Spacing.lg,
  },
  optionsScrollWrap: {
    maxHeight: 360,
    marginBottom: Spacing.md,
  },
  optionsScroll: {
    flexGrow: 0,
  },
  options: {
    gap: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  option: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionSelected: {
    borderColor: Colors.cyan,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  optionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionTextSelected: {
    color: Colors.cyan,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.lg,
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
  confirmButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radii.pill,
    backgroundColor: Colors.cyan,
  },
  confirmText: {
    color: Colors.black,
    fontSize: 15,
    fontWeight: '600',
  },
});
