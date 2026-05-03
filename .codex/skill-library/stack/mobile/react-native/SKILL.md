---
name: react-native
description: "Expert React Native guide covering Expo vs bare workflow, navigation (React Navigation, Expo Router), native modules, platform-specific code, performance (FlatList, memo, Hermes), state management, animations (Reanimated, Gesture Handler), testing (Detox, RNTL), and deployment (EAS Build, CodePush). Use when building cross-platform mobile apps with React Native."
version: 1.0.0
---

# React Native Expert Guide

> Use this skill when building iOS/Android apps with React Native. Targets React Native 0.73+ with Expo SDK 50+ or bare workflow.

## When to Use This Skill

- Building cross-platform mobile apps (iOS + Android)
- Choosing between Expo and bare React Native
- Implementing navigation, animations, or native modules
- Optimizing mobile performance (lists, renders, memory)
- Setting up CI/CD for mobile app deployment

## When NOT to Use This Skill

- Web-only apps → use Next.js / React
- Native iOS only → use SwiftUI
- Native Android only → use Kotlin Compose
- Game development → use Godot or Unity
- Flutter projects → use Flutter skill

---

## 1. Project Setup (CRITICAL)

### Expo vs Bare Workflow

| Factor | Expo (Managed) | Bare |
|--------|---------------|------|
| Setup time | Minutes | Hours |
| Native modules | Expo Modules API | Manual linking |
| OTA updates | Built-in (EAS Update) | CodePush |
| EAS Build | ✅ Cloud builds | Manual Xcode/Gradle |
| Custom native code | Via config plugins | Full access |
| **Recommendation** | **Start here** | Only if Expo can't support a requirement |

```bash
# ✅ Start with Expo
npx create-expo-app@latest my-app --template blank-typescript

# Bare workflow (only when needed)
npx react-native@latest init MyApp
```

### Project Structure

```
src/
├── app/                 # Expo Router screens (file-based routing)
│   ├── (tabs)/          # Tab layout group
│   │   ├── _layout.tsx
│   │   ├── index.tsx    # Home tab
│   │   └── profile.tsx  # Profile tab
│   ├── _layout.tsx      # Root layout
│   └── [id].tsx         # Dynamic route
├── components/          # Reusable UI components
│   ├── ui/              # Design system primitives
│   └── features/        # Feature-specific components
├── hooks/               # Custom hooks
├── services/            # API clients, storage
├── stores/              # State management
├── constants/           # Colors, dimensions, config
└── types/               # TypeScript type definitions
```

---

## 2. Navigation

### Expo Router (Recommended)

```tsx
// app/_layout.tsx
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
```

```tsx
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Typed Navigation

```tsx
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function DetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  return (
    <Pressable onPress={() => router.push(`/items/${id}`)}>
      <Text>View Item {id}</Text>
    </Pressable>
  );
}
```

---

## 3. Performance (CRITICAL)

### FlatList Optimization

```tsx
import { FlatList, type ListRenderItem } from 'react-native';

const renderItem: ListRenderItem<Item> = ({ item }) => (
  <ItemRow item={item} />
);

const keyExtractor = (item: Item) => item.id;

<FlatList
  data={items}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  // ✅ Performance props
  removeClippedSubviews={true}
  maxToRenderPerBatch={10}
  windowSize={5}
  initialNumToRender={10}
  getItemLayout={(_, index) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  })}
/>
```

### Memoization

```tsx
import { memo, useCallback, useMemo } from 'react';

// ✅ Memoize list items
const ItemRow = memo(function ItemRow({ item, onPress }: Props) {
  return (
    <Pressable onPress={() => onPress(item.id)}>
      <Text>{item.title}</Text>
    </Pressable>
  );
});

// ✅ Stable callbacks
const onItemPress = useCallback((id: string) => {
  router.push(`/items/${id}`);
}, []);

// ✅ Expensive computations
const filteredItems = useMemo(
  () => items.filter(i => i.category === selectedCategory),
  [items, selectedCategory]
);
```

### Image Optimization

```tsx
import { Image } from 'expo-image';

// ✅ expo-image with caching
<Image
  source={{ uri: imageUrl }}
  style={{ width: 200, height: 200 }}
  contentFit="cover"
  placeholder={blurhash}
  transition={200}
/>
```

---

## 4. Animations

### Reanimated

```tsx
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

function AnimatedCard() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn = () => { scale.value = withSpring(0.95); };
  const onPressOut = () => { scale.value = withSpring(1); };

  return (
    <Pressable onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.card, animatedStyle]}>
        <Text>Press me</Text>
      </Animated.View>
    </Pressable>
  );
}
```

### Gesture Handler

```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

function SwipeableCard() {
  const translateX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => { translateX.value = e.translationX; })
    .onEnd(() => {
      if (Math.abs(translateX.value) > SWIPE_THRESHOLD) {
        translateX.value = withTiming(
          translateX.value > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH
        );
      } else {
        translateX.value = withSpring(0);
      }
    });

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View style={useAnimatedStyle(() => ({
        transform: [{ translateX: translateX.value }],
      }))}>
        <Text>Swipe me</Text>
      </Animated.View>
    </GestureDetector>
  );
}
```

---

## 5. Platform-Specific Code

```tsx
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 } },
      android: { elevation: 4 },
    }),
  },
});

// File-based: Component.ios.tsx / Component.android.tsx
```

---

## 6. Deployment

### EAS Build (Expo)

```bash
# Install EAS CLI
npm install -g eas-cli

# Configure
eas build:configure

# Build
eas build --platform all --profile production

# Submit to stores
eas submit --platform ios
eas submit --platform android
```

### OTA Updates

```bash
# Push JS-only updates without App Store review
eas update --branch production --message "Bug fix"
```

---

## 7. Common Anti-Patterns

1. **Inline styles** — use `StyleSheet.create()` for performance (styles are sent to native once)
2. **Anonymous functions in renderItem** — causes re-renders; extract and memoize
3. **ScrollView for long lists** — use `FlatList` or `FlashList` for virtualization
4. **Ignoring Hermes** — enable Hermes engine for faster startup and lower memory
5. **Not testing on real devices** — simulators miss performance issues and native behaviors
6. **Storing sensitive data in AsyncStorage** — use `expo-secure-store` for tokens/secrets
7. **Giant bundle sizes** — use `react-native-bundle-visualizer` to audit imports

---

## References

- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/docs/getting-started)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/)
- [React Native Performance](https://reactnative.dev/docs/performance)
