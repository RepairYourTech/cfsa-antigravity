---
name: expo-react-native
description: Comprehensive Expo and React Native skill covering project setup (Expo CLI, EAS), file-based routing (Expo Router), native modules, platform-specific code, navigation patterns, gestures, animations (Reanimated), asset management, OTA updates, app store builds (EAS Build), push notifications, and debugging. Use when building mobile applications with Expo or React Native.
version: 1.0.0
---

# Expo / React Native

Framework for building native mobile apps with React. Expo provides managed workflow tooling, file-based routing, OTA updates, and cloud build services.

## Project Setup

### Create New Project

```bash
npx create-expo-app@latest my-app --template tabs
cd my-app
npx expo start
```

### Key Dependencies

```bash
# Navigation (file-based routing)
npx expo install expo-router expo-linking expo-constants expo-status-bar

# Common native modules
npx expo install expo-camera expo-image-picker expo-location expo-file-system
npx expo install expo-secure-store expo-haptics expo-clipboard

# Animations
npx expo install react-native-reanimated react-native-gesture-handler

# Safe area handling
npx expo install react-native-safe-area-context react-native-screens
```

### app.json / app.config.ts

```typescript
// app.config.ts
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'My App',
  slug: 'my-app',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'myapp', // deep linking scheme
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.example.myapp',
    infoPlist: {
      NSCameraUsageDescription: 'This app uses the camera to take photos.',
      NSPhotoLibraryUsageDescription: 'This app accesses your photos.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.example.myapp',
    permissions: ['CAMERA', 'READ_EXTERNAL_STORAGE'],
  },
  plugins: [
    'expo-router',
    ['expo-camera', { cameraPermission: 'Allow camera access for photos.' }],
    'expo-secure-store',
  ],
  extra: {
    eas: { projectId: 'your-eas-project-id' },
    apiUrl: process.env.API_URL,
  },
});
```

## Expo Router (File-Based Routing)

### Directory Structure

```
app/
  _layout.tsx              # Root layout
  index.tsx                # / (home screen)
  (tabs)/                  # Tab group
    _layout.tsx            # Tab layout
    index.tsx              # First tab
    explore.tsx            # Second tab
    profile.tsx            # Third tab
  (auth)/                  # Auth group
    _layout.tsx            # Auth layout (no tabs)
    sign-in.tsx
    sign-up.tsx
  settings/
    _layout.tsx            # Stack layout for settings
    index.tsx              # /settings
    notifications.tsx      # /settings/notifications
  post/
    [id].tsx               # /post/123 (dynamic route)
  [...missing].tsx         # Catch-all 404
```

### Root Layout

```typescript
// app/_layout.tsx
import { Stack } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'Inter-Regular': require('../assets/fonts/Inter-Regular.ttf'),
    'Inter-Bold': require('../assets/fonts/Inter-Bold.ttf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="post/[id]" options={{ title: 'Post' }} />
      </Stack>
    </ThemeProvider>
  );
}
```

### Tab Layout

```typescript
// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColorScheme } from 'react-native';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colorScheme === 'dark' ? '#fff' : '#007AFF',
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#ffffff',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Navigation

```typescript
import { Link, useRouter, useLocalSearchParams, useGlobalSearchParams, Redirect } from 'expo-router';
import { Pressable, Text } from 'react-native';

function HomeScreen() {
  const router = useRouter();

  return (
    <>
      {/* Declarative link */}
      <Link href="/settings" asChild>
        <Pressable>
          <Text>Go to Settings</Text>
        </Pressable>
      </Link>

      {/* Programmatic navigation */}
      <Pressable onPress={() => router.push('/post/123')}>
        <Text>View Post</Text>
      </Pressable>

      {/* Replace current screen (no back) */}
      <Pressable onPress={() => router.replace('/(tabs)')}>
        <Text>Go Home</Text>
      </Pressable>

      {/* Go back */}
      <Pressable onPress={() => router.back()}>
        <Text>Go Back</Text>
      </Pressable>

      {/* Navigate with params */}
      <Pressable onPress={() => router.push({ pathname: '/post/[id]', params: { id: '456' } })}>
        <Text>View Post 456</Text>
      </Pressable>
    </>
  );
}

// Dynamic route page
function PostScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Text>Post ID: {id}</Text>;
}

// Conditional redirect
function ProtectedScreen() {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  return <Text>Protected Content</Text>;
}
```

## Platform-Specific Code

### Platform Module

```typescript
import { Platform, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  container: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1 },
      android: { elevation: 4 },
      web: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)' },
    }),
  },
});
```

### Platform-Specific Files

```
components/
  Button.tsx          # Shared
  Button.ios.tsx      # iOS override
  Button.android.tsx  # Android override
  Button.web.tsx      # Web override
```

React Native auto-resolves `import Button from './Button'` to the correct platform file.

## Animations (Reanimated)

### Basic Animation

```typescript
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Pressable, View } from 'react-native';

function AnimatedBox() {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotateZ: `${rotation.value}deg` },
    ],
  }));

  function handlePress() {
    scale.value = withSpring(1.5, { damping: 10, stiffness: 100 });
    rotation.value = withTiming(360, { duration: 500, easing: Easing.bezier(0.25, 0.1, 0.25, 1) });
  }

  return (
    <Pressable onPress={handlePress}>
      <Animated.View style={[{ width: 100, height: 100, backgroundColor: 'blue' }, animatedStyle]} />
    </Pressable>
  );
}
```

### Layout Animations

```typescript
import Animated, { FadeIn, FadeOut, SlideInRight, Layout } from 'react-native-reanimated';

function AnimatedList({ items }: { items: Item[] }) {
  return (
    <View>
      {items.map((item) => (
        <Animated.View
          key={item.id}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(200)}
          layout={Layout.springify()}
        >
          <Text>{item.title}</Text>
        </Animated.View>
      ))}
    </View>
  );
}
```

## Gestures

```typescript
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

function DraggableCard() {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      translateX.value = withSpring(0);
      translateY.value = withSpring(0);
    });

  const pinchGesture = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = event.scale;
    })
    .onEnd(() => {
      scale.value = withSpring(1);
    });

  const composedGesture = Gesture.Simultaneous(panGesture, pinchGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.card, animatedStyle]} />
    </GestureDetector>
  );
}
```

## Secure Storage

```typescript
import * as SecureStore from 'expo-secure-store';

// Store sensitive data (tokens, keys)
async function saveToken(key: string, value: string): Promise<void> {
  await SecureStore.setItemAsync(key, value);
}

async function getToken(key: string): Promise<string | null> {
  return await SecureStore.getItemAsync(key);
}

async function deleteToken(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}

// Usage
await saveToken('auth_token', 'eyJhbGciOiJIUzI1NiIs...');
const token = await getToken('auth_token');
```

## Push Notifications

```typescript
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn('Push notifications require a physical device');
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const { data: token } = await Notifications.getExpoPushTokenAsync({
    projectId: 'your-eas-project-id',
  });

  return token;
}

// Listen for notifications
function useNotificationListeners() {
  useEffect(() => {
    // Notification received while app is foregrounded
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Received:', notification.request.content);
    });

    // User tapped on a notification
    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      // Navigate based on notification data
      router.push(data.url as string);
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, []);
}
```

## EAS Build and Submit

### Configuration

```json
// eas.json
{
  "cli": { "version": ">= 5.0.0" },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": { "simulator": true },
      "env": { "API_URL": "https://dev-api.example.com" }
    },
    "preview": {
      "distribution": "internal",
      "ios": { "simulator": false },
      "env": { "API_URL": "https://staging-api.example.com" }
    },
    "production": {
      "env": { "API_URL": "https://api.example.com" },
      "autoIncrement": true
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "123456789",
        "appleTeamId": "TEAM_ID"
      },
      "android": {
        "serviceAccountKeyPath": "./google-services.json",
        "track": "production"
      }
    }
  }
}
```

### CLI Commands

```bash
# Development build (includes dev tools)
eas build --profile development --platform ios
eas build --profile development --platform android

# Production build
eas build --profile production --platform all

# Submit to stores
eas submit --platform ios --latest
eas submit --platform android --latest

# OTA updates (no rebuild needed)
eas update --branch production --message "Fix login bug"
eas update --branch preview --message "New feature preview"

# Check build status
eas build:list
```

## OTA Updates

```typescript
// app/_layout.tsx — check for updates on app launch
import * as Updates from 'expo-updates';
import { useEffect } from 'react';
import { Alert } from 'react-native';

function useOTAUpdates() {
  useEffect(() => {
    if (__DEV__) return; // skip in development

    async function checkForUpdates() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          await Updates.fetchUpdateAsync();
          Alert.alert(
            'Update Available',
            'A new version has been downloaded. Restart to apply.',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Restart', onPress: () => Updates.reloadAsync() },
            ]
          );
        }
      } catch (error) {
        console.error('OTA update check failed:', error);
      }
    }

    checkForUpdates();
  }, []);
}
```

## Image Handling

```typescript
import { Image } from 'expo-image';

// expo-image is the recommended image component (replaces RN Image)
function Avatar({ uri, size = 48 }: { uri: string; size?: number }) {
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: size / 2 }}
      contentFit="cover"
      placeholder={require('../assets/avatar-placeholder.png')}
      transition={200}
      cachePolicy="memory-disk"
    />
  );
}
```

## Debugging

```bash
# Start dev server
npx expo start

# Open on specific platform
npx expo start --ios
npx expo start --android
npx expo start --web

# Clear cache
npx expo start --clear

# Doctor — check for configuration issues
npx expo doctor

# Prebuild — generate native projects for inspection
npx expo prebuild --clean
```

### React Native Debugger Shortcuts

| Action | iOS Simulator | Android Emulator |
|--------|--------------|-----------------|
| Open dev menu | Cmd + D | Cmd + M |
| Reload | Cmd + R | R, R |
| Toggle inspector | Dev menu > Toggle Inspector | Dev menu > Toggle Inspector |

## Anti-Patterns

| Anti-Pattern | Correct Approach |
|-------------|-----------------|
| Using React Native `Image` for remote images | Use `expo-image` for better caching, transitions, and performance |
| Storing tokens in AsyncStorage | Use `expo-secure-store` for sensitive data (encrypted storage) |
| Inline styles on every component | Use `StyleSheet.create` for static styles, shared theme for dynamic |
| Not handling keyboard on forms | Use `KeyboardAvoidingView` or `react-native-keyboard-aware-scroll-view` |
| Testing only on simulator | Always test on physical devices before release |
| Ignoring safe areas | Wrap content in `SafeAreaView` or use `useSafeAreaInsets` |
| Using `expo eject` when a native module is needed | Use config plugins or development builds instead |
| Not setting up EAS Update branches | Configure update branches per environment (production, preview, development) |
| Blocking the JS thread with animations | Use `react-native-reanimated` worklets that run on the UI thread |
| Using `console.log` in production builds | Remove or conditionally disable logging in production |
| Large bundle without code splitting | Use lazy loading with `React.lazy` and Expo Router's built-in code splitting |
| Hardcoding API URLs | Use `app.config.ts` with environment-specific `extra` values |
