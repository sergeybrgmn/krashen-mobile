import { useUser } from '@clerk/clerk-expo';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';

interface UserAvatarProps {
  size?: number;
  onPress: () => void;
}

export function UserAvatar({ size = 36, onPress }: UserAvatarProps) {
  const { user } = useUser();

  const initials = (user?.firstName ?? user?.emailAddresses?.[0]?.emailAddress ?? '?')
    .charAt(0)
    .toUpperCase();

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <Pressable onPress={onPress} hitSlop={8}>
      {user?.imageUrl ? (
        <Image
          source={{ uri: user.imageUrl }}
          style={[styles.image, avatarStyle, styles.ring]}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.fallback, avatarStyle, styles.ring]}>
          <ThemedText style={[styles.initial, { fontSize: size * 0.45 }]}>
            {initials}
          </ThemedText>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: Colors.card,
  },
  ring: {
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  fallback: {
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: Colors.cyan,
    fontWeight: '600',
  },
});
