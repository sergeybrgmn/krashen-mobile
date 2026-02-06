export const Colors = {
  background: '#000000',
  card: 'rgba(15, 23, 42, 0.9)',
  cardLight: 'rgba(15, 23, 42, 0.85)',

  cyan: '#06b6d4',
  cyanStrong: '#0ea5e9',
  orange: '#f97316',

  textPrimary: 'rgba(248, 250, 252, 0.92)',
  textSecondary: 'rgba(226, 232, 240, 0.72)',
  textMuted: 'rgba(148, 163, 184, 0.85)',

  border: 'rgba(248, 250, 252, 0.12)',
  borderHover: 'rgba(248, 250, 252, 0.28)',

  error: '#f87171',
  errorLight: '#fca5a5',

  white: '#ffffff',
  black: '#000000',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const Radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
};

export const Sizes = {
  playPauseButton: 72,
  skipButton: 72,
  askButton: { minHeight: 56, minWidth: 180 },
  cancelButton: 48,
  sendButton: 56,
  podcastCard: 140,
  progressTrack: 10,
  progressThumb: 18,
};

export const Typography = {
  base: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.textPrimary,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold' as const,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.textPrimary,
  },
  small: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  muted: {
    fontSize: 12,
    color: Colors.textMuted,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.18 * 12,
  },
};
