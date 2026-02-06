import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { getLanguageName } from '@/constants/languages';
import { Colors, Radii, Spacing } from '@/constants/theme';

interface Props {
  languages: string[];
  selected: string | null;
  onSelect: (lang: string | null) => void;
}

export function LanguagePicker({ languages, selected, onSelect }: Props) {
  const [visible, setVisible] = useState(false);

  const displayLabel = selected ? getLanguageName(selected) : 'All Languages';

  return (
    <View>
      <Pressable style={styles.trigger} onPress={() => setVisible(true)}>
        <ThemedText style={styles.triggerText}>{displayLabel}</ThemedText>
        <ThemedText style={styles.arrow}>▼</ThemedText>
      </Pressable>

      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setVisible(false)}>
          <View style={styles.dropdown}>
            <Pressable
              style={styles.option}
              onPress={() => {
                onSelect(null);
                setVisible(false);
              }}
            >
              <ThemedText
                style={[styles.optionText, !selected && styles.optionSelected]}
              >
                All Languages
              </ThemedText>
            </Pressable>

            <FlatList
              data={languages}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => {
                    onSelect(item);
                    setVisible(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.optionText,
                      selected === item && styles.optionSelected,
                    ]}
                  >
                    {getLanguageName(item)}
                  </ThemedText>
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.card,
  },
  triggerText: {
    fontSize: 15,
    color: Colors.textPrimary,
    flex: 1,
  },
  arrow: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: Spacing.sm,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  dropdown: {
    backgroundColor: Colors.card,
    borderRadius: Radii.sm,
    maxHeight: 400,
    overflow: 'hidden',
  },
  option: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  optionText: {
    fontSize: 15,
    color: Colors.textPrimary,
  },
  optionSelected: {
    color: Colors.cyan,
    fontWeight: '600',
  },
});
