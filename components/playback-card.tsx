import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';

import { ProgressBar } from '@/components/progress-bar';
import { ThemedText } from '@/components/themed-text';
import { Colors, Radii, Sizes, Spacing } from '@/constants/theme';

interface Props {
  isPlaying: boolean;
  isLoaded: boolean;
  position: number;
  duration: number;
  buffered: number;
  speed: number;
  speedOptions: number[];
  audioUrl: string | null;
  onTogglePlay: () => void;
  onSkip: (delta: number) => void;
  onSeek: (seconds: number) => void;
  onChangeSpeed: (speed: number) => void;
}

export function PlaybackCard({
  isPlaying,
  isLoaded,
  position,
  duration,
  buffered,
  speed,
  speedOptions,
  audioUrl,
  onTogglePlay,
  onSkip,
  onSeek,
  onChangeSpeed,
}: Props) {
  const [speedModalVisible, setSpeedModalVisible] = useState(false);
  const disabled = !audioUrl || !isLoaded;

  return (
    <View style={styles.card}>
      {/* Transport Controls */}
      <View style={styles.transport}>
        <Pressable
          style={[styles.skipButton, disabled && styles.disabled]}
          onPress={() => onSkip(-15)}
          disabled={disabled}
        >
          <ThemedText style={styles.skipText}>-15s</ThemedText>
        </Pressable>

        <Pressable
          style={[styles.playButton, disabled && styles.disabled]}
          onPress={onTogglePlay}
          disabled={disabled}
        >
          <ThemedText style={styles.playIcon}>
            {isPlaying ? '⏸' : '▶'}
          </ThemedText>
        </Pressable>

        <Pressable
          style={[styles.skipButton, disabled && styles.disabled]}
          onPress={() => onSkip(15)}
          disabled={disabled}
        >
          <ThemedText style={styles.skipText}>+15s</ThemedText>
        </Pressable>
      </View>

      {/* Progress Bar */}
      <ProgressBar
        position={position}
        duration={duration}
        buffered={buffered}
        disabled={disabled}
        onSeek={onSeek}
      />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerLeft}>
          {!audioUrl && (
            <ThemedText style={styles.statusText}>
              Episode audio unavailable.
            </ThemedText>
          )}
          {audioUrl && !isLoaded && (
            <ThemedText style={styles.statusText}>
              Loading audio...
            </ThemedText>
          )}
        </View>

        <Pressable
          style={styles.speedButton}
          onPress={() => setSpeedModalVisible(true)}
        >
          <ThemedText style={styles.speedLabel}>Speed </ThemedText>
          <ThemedText style={styles.speedValue}>{speed}x</ThemedText>
        </Pressable>
      </View>

      {/* Speed dropdown modal */}
      <Modal
        visible={speedModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSpeedModalVisible(false)}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => setSpeedModalVisible(false)}
        >
          <View style={styles.speedDropdown}>
            <FlatList
              data={speedOptions}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.speedOption}
                  onPress={() => {
                    onChangeSpeed(item);
                    setSpeedModalVisible(false);
                  }}
                >
                  <ThemedText
                    style={[
                      styles.speedOptionText,
                      item === speed && styles.speedOptionSelected,
                    ]}
                  >
                    {item}x
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
  card: {
    backgroundColor: Colors.card,
    borderRadius: Radii.xl,
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  skipButton: {
    minWidth: Sizes.skipButton,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Radii.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  playButton: {
    width: Sizes.playPauseButton,
    height: Sizes.playPauseButton,
    borderRadius: Sizes.playPauseButton / 2,
    backgroundColor: Colors.cyan,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.cyan,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  playIcon: {
    fontSize: 24,
    color: Colors.black,
  },
  disabled: {
    opacity: 0.4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
  },
  statusText: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  speedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  speedLabel: {
    fontSize: 13,
    color: Colors.textMuted,
  },
  speedValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  speedDropdown: {
    backgroundColor: Colors.card,
    borderRadius: Radii.sm,
    width: 140,
    overflow: 'hidden',
  },
  speedOption: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  speedOptionText: {
    fontSize: 15,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  speedOptionSelected: {
    color: Colors.cyan,
    fontWeight: '600',
  },
});
