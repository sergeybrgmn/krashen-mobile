import { StyleSheet, Text, type TextProps } from 'react-native';

import { Colors, Typography } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'subtitle' | 'small' | 'muted' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        styles.default,
        type === 'title' && styles.title,
        type === 'subtitle' && styles.subtitle,
        type === 'small' && styles.small,
        type === 'muted' && styles.muted,
        type === 'link' && styles.link,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    ...Typography.base,
  },
  title: {
    ...Typography.title,
  },
  subtitle: {
    ...Typography.subtitle,
  },
  small: {
    ...Typography.small,
  },
  muted: {
    ...Typography.muted,
  },
  link: {
    fontSize: 15,
    lineHeight: 24,
    color: Colors.cyan,
  },
});
