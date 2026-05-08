---
name: mobile-responsive-patterns
description: Touch-first UI patterns for mobile applications covering touch targets, gestures, safe areas, platform conventions, and responsive layouts. Use when building or specifying mobile interfaces that must feel native and accessible across iOS and Android.
version: 1.0.0
---

# Mobile Responsive Patterns

Build mobile interfaces that feel native, accessible, and responsive across device sizes and platforms.

## Touch Target Sizing

WCAG 2.1 Success Criterion 2.5.8 requires minimum touch targets of 24x24 CSS pixels, but platform guidelines and usability research recommend larger minimums.

| Platform | Minimum Target | Recommended | Spacing |
|----------|---------------|-------------|---------|
| iOS (HIG) | 44x44pt | 44x44pt | 8pt between targets |
| Android (Material) | 48x48dp | 48x48dp | 8dp between targets |
| WCAG AAA | 44x44 CSS px | 48x48 CSS px | No overlap with adjacent targets |

```tsx
// React Native - Touchable with enforced minimum hit area
import { Pressable, StyleSheet } from 'react-native';

function IconButton({ icon, onPress, label }: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      accessibilityRole="button"
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        styles.button,
        pressed && styles.buttonPressed,
      ]}
    >
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 48,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
```

**Anti-pattern**: Tiny icons with no padding that are impossible to tap accurately.
**Anti-pattern**: Text links in dense lists with no vertical spacing between items.

## Gesture Handling

### Common Gestures and Their Conventions

| Gesture | Use Case | Feedback Required |
|---------|----------|-------------------|
| Tap | Primary action | Visual press state |
| Long press | Secondary actions / context menu | Haptic + visual highlight |
| Swipe horizontal | Reveal actions, navigate back, dismiss | Spring animation, action preview |
| Swipe vertical | Scroll, pull-to-refresh, dismiss sheet | Elastic overscroll |
| Pinch | Zoom content (maps, images) | Smooth scale transform |
| Double tap | Zoom to fit / like | Scale animation at tap point |
| Pan | Move/reorder items, adjust sliders | Drag shadow, drop zone highlight |

```tsx
// React Native Gesture Handler - Swipe to delete
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const translateX = useSharedValue(0);
  const DELETE_THRESHOLD = -80;

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-5, 5]) // Prevent conflict with vertical scroll
    .onUpdate((event) => {
      translateX.value = Math.min(0, event.translationX);
    })
    .onEnd(() => {
      if (translateX.value < DELETE_THRESHOLD) {
        runOnJS(onDelete)();
      }
      translateX.value = withSpring(0);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={animatedStyle}>{children}</Animated.View>
    </GestureDetector>
  );
}
```

**Anti-pattern**: Custom gestures that conflict with OS-level gestures (swipe-from-edge on iOS = back navigation).
**Anti-pattern**: Gestures without visual affordance -- users cannot discover invisible interactions.

## Safe Area Insets

Modern devices have notches, dynamic islands, home indicators, rounded corners, and camera cutouts that occlude content.

```tsx
// React Native - SafeAreaView with granular control
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ScreenContainer({ children, edges }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        paddingTop: edges?.includes('top') ? insets.top : 0,
        paddingBottom: edges?.includes('bottom') ? insets.bottom : 0,
        paddingLeft: edges?.includes('left') ? insets.left : 0,
        paddingRight: edges?.includes('right') ? insets.right : 0,
      }}
    >
      {children}
    </View>
  );
}

// Usage: only pad top and bottom, let content extend to horizontal edges
<ScreenContainer edges={['top', 'bottom']}>
  <ScrollView>{/* content */}</ScrollView>
</ScreenContainer>
```

```css
/* Web - CSS env() for safe areas */
.app-container {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
  padding-left: env(safe-area-inset-left);
  padding-right: env(safe-area-inset-right);
}

/* Bottom fixed element must clear home indicator */
.bottom-bar {
  position: fixed;
  bottom: 0;
  padding-bottom: calc(12px + env(safe-area-inset-bottom));
}
```

**Anti-pattern**: Ignoring safe areas and letting content render behind the notch or under the home indicator.
**Anti-pattern**: Applying safe area padding to every nested component instead of once at the screen level.

## iOS vs Android Conventions

| Element | iOS (HIG) | Android (Material 3) |
|---------|-----------|---------------------|
| Back navigation | Swipe from left edge, top-left chevron | System back button/gesture, top-left arrow |
| Action placement | Top-right bar button | FAB or top-right icon |
| Alerts | Centered modal with rounded corners | Centered dialog with title |
| Tabs | Bottom tab bar (always visible) | Bottom navigation bar or top tabs |
| Segmented control | `UISegmentedControl` | Material `SegmentedButton` or chip row |
| Selection | Checkmark trailing | Checkbox leading |
| Destructive actions | Red text, swipe to reveal | Snackbar with undo |
| Date/time picker | Spinning wheel or inline calendar | Dialog with calendar/clock |
| Search | Pull-down or inline in nav bar | Top app bar with search icon expanding |
| Typography scale | SF Pro (system), dynamic type | Roboto (system), Material type scale |

## Bottom Sheet Patterns

Bottom sheets are the dominant modal pattern on mobile. They preserve context and support progressive disclosure.

| Type | Behavior | Use Case |
|------|----------|----------|
| Modal | Dims background, blocks interaction | Confirmations, forms, detail views |
| Persistent | No dim, partial screen, draggable | Maps (Google Maps), music player |
| Expanding | Starts small, drags to full screen | Search, filters, content preview |

```tsx
// React Native - Bottom sheet with snap points
import BottomSheet from '@gorhom/bottom-sheet';

function FilterSheet({ filters, onApply }: FilterSheetProps) {
  const snapPoints = useMemo(() => ['25%', '50%', '90%'], []);
  const bottomSheetRef = useRef<BottomSheet>(null);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={(props) => (
        <BottomSheetBackdrop {...props} disappearsOnIndex={-1} />
      )}
      handleIndicatorStyle={{ backgroundColor: '#999', width: 40 }}
    >
      <BottomSheetScrollView contentContainerStyle={{ padding: 16 }}>
        {/* Filter controls */}
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
```

**Rule**: Always include a visible drag handle (pill indicator) at the top.
**Rule**: Bottom sheets must be dismissible by dragging down or tapping the backdrop.

## Pull-to-Refresh

```tsx
// React Native
import { RefreshControl, FlatList } from 'react-native';

function FeedList({ data, onRefresh }: FeedListProps) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor="#6366f1" // iOS spinner color
          colors={['#6366f1']} // Android spinner colors
        />
      }
    />
  );
}
```

**Anti-pattern**: Pull-to-refresh on screens where the content is not a scrollable list.
**Anti-pattern**: No loading indicator during refresh, making it unclear if anything is happening.

## Haptic Feedback

Use haptics to confirm actions, not to decorate every interaction.

| Event | Haptic Type | Platform API |
|-------|-------------|--------------|
| Toggle switch | Light impact | `UIImpactFeedbackGenerator(.light)` / `HapticFeedback.perform(HapticFeedbackTypes.impactLight)` |
| Destructive action confirm | Warning notification | `UINotificationFeedbackGenerator(.warning)` |
| Success (payment, save) | Success notification | `UINotificationFeedbackGenerator(.success)` |
| Selection change (picker) | Selection changed | `UISelectionFeedbackGenerator()` |
| Error / invalid input | Error notification | `UINotificationFeedbackGenerator(.error)` |

```tsx
import * as Haptics from 'expo-haptics';

function ToggleSwitch({ value, onToggle }: ToggleSwitchProps) {
  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onToggle(!value);
  };

  return <Switch value={value} onValueChange={handleToggle} />;
}
```

**Anti-pattern**: Haptics on every tap. Users will disable haptics globally, losing the signal for important actions.

## Keyboard Avoidance

When the software keyboard opens, input fields must remain visible and accessible.

```tsx
// React Native - KeyboardAvoidingView with platform behavior
import { KeyboardAvoidingView, Platform } from 'react-native';

function ChatInput() {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      style={{ flex: 1 }}
    >
      <ScrollView style={{ flex: 1 }}>{/* Messages */}</ScrollView>
      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          returnKeyType="send"
        />
      </View>
    </KeyboardAvoidingView>
  );
}
```

**Rule**: On iOS, use `behavior="padding"`. On Android, `android:windowSoftInputMode="adjustResize"` in AndroidManifest often suffices.
**Rule**: Always test with hardware keyboards and external keyboards that do not trigger software keyboard.

## Tab Bar vs Hamburger Navigation

Research consistently shows bottom tab bars outperform hamburger menus for discoverability and engagement.

| Pattern | When to Use | Limit |
|---------|-------------|-------|
| Bottom tab bar | 3-5 top-level destinations | Max 5 tabs |
| Hamburger / drawer | 6+ destinations, or secondary nav | Always pair with a visible primary nav |
| Top tabs | Related content categories (e.g., Feed / Trending / Following) | Max 5-7 tabs, scrollable if more |

```tsx
// React Navigation - Bottom tabs
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          const icon = TAB_ICONS[route.name];
          return <Icon name={icon} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#9ca3af',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Create" component={CreateScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

**Anti-pattern**: Hiding primary navigation behind a hamburger menu when you have 4 or fewer destinations.
**Anti-pattern**: More than 5 items in a bottom tab bar.

## Responsive Typography

Support the user's preferred text size. Both iOS Dynamic Type and Android font scaling must be respected.

```tsx
// React Native - Scaled text that respects system font size
import { Text, PixelRatio, StyleSheet } from 'react-native';

// Allow system scaling but cap maximum to prevent layout breakage
const scaledFontSize = (size: number, maxScale: number = 1.5): number => {
  const scale = PixelRatio.getFontScale();
  const cappedScale = Math.min(scale, maxScale);
  return size * cappedScale;
};

const styles = StyleSheet.create({
  heading: {
    fontSize: 24, // React Native respects system font scaling by default
    fontWeight: '700',
    lineHeight: 32,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
});

// To disable automatic scaling (use sparingly, e.g., fixed badges):
<Text allowFontScaling={false} style={styles.badge}>3</Text>
```

**Rule**: Never disable font scaling globally. Only disable it for fixed-size UI elements (badges, tab bar labels).
**Rule**: Test layouts at the largest system font size. If it breaks, use `ScrollView` or truncation, not font scaling limits.

## Mobile Web Responsive Breakpoints

```css
/* Mobile-first: base styles target phones */
.container {
  padding: 16px;
}

/* Small tablets and large phones (landscape) */
@media (min-width: 600px) {
  .container { padding: 24px; }
  .grid { grid-template-columns: repeat(2, 1fr); }
}

/* Tablets */
@media (min-width: 905px) {
  .container { padding: 32px; max-width: 840px; margin: 0 auto; }
  .grid { grid-template-columns: repeat(3, 1fr); }
}

/* Prevent tap highlight on touch devices */
@media (hover: none) and (pointer: coarse) {
  button { -webkit-tap-highlight-color: transparent; }
  button:active { transform: scale(0.97); }
}

/* Hover effects only for non-touch devices */
@media (hover: hover) and (pointer: fine) {
  button:hover { background-color: var(--hover-bg); }
}
```

## Output Checklist

- [ ] Touch targets meet 48x48dp minimum
- [ ] Gestures have visual affordance and do not conflict with OS gestures
- [ ] Safe area insets applied at screen container level
- [ ] Platform conventions respected (iOS HIG / Material 3)
- [ ] Bottom sheets include drag handle and backdrop dismiss
- [ ] Keyboard does not obscure active inputs
- [ ] Navigation uses bottom tabs for 3-5 primary destinations
- [ ] Typography respects system font scaling
- [ ] Haptic feedback used for meaningful state changes only
- [ ] Tested at largest system font size and smallest supported screen width
