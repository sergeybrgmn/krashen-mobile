import { View, type ViewProps } from 'react-native';

import { Colors } from '@/constants/theme';

export type ThemedViewProps = ViewProps & {
  variant?: 'screen' | 'card';
};

export function ThemedView({ style, variant = 'screen', ...rest }: ThemedViewProps) {
  const backgroundColor = variant === 'card' ? Colors.card : Colors.background;
  return <View style={[{ backgroundColor }, style]} {...rest} />;
}
