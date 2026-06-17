import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/IconSymbol';
import { BlurView } from 'expo-blur';
import { useTheme } from '@react-navigation/native';
import { COLORS } from '@/constants/Colors';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Href } from 'expo-router';

const { width: screenWidth } = Dimensions.get('window');

export interface TabBarItem {
  name: string;
  route: Href;
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
}

interface FloatingTabBarProps {
  tabs: TabBarItem[];
  containerWidth?: number;
  borderRadius?: number;
  bottomMargin?: number;
}

export default function FloatingTabBar(props: FloatingTabBarProps) {
  return <FloatingTabBarInner {...props} />;
}

function FloatingTabBarInner({
  tabs,
  containerWidth = screenWidth / 2.5,
  borderRadius = 35,
  bottomMargin
}: FloatingTabBarProps) {
  const router = useRouter();
  const rawPathname = usePathname();
  const theme = useTheme();
  const animatedValue = useSharedValue(0);
  const safeTabs = React.useMemo(() => tabs ?? [], [tabs]);

  // Defer pathname to after mount so navigation context is fully ready on first render
  const [pathname, setPathname] = React.useState('');
  React.useEffect(() => {
    try {
      if (typeof rawPathname === 'string' && rawPathname) {
        setPathname(rawPathname);
      }
    } catch (e) {
      console.warn('[FloatingTabBar] Could not read pathname:', e);
    }
  }, [rawPathname]);

  // Improved active tab detection with better path matching
  const activeTabIndex = React.useMemo(() => {
    // Guard: pathname can be null/undefined on first mount or during boundary remount
    const safePath = typeof pathname === 'string' ? pathname : '';
    if (!safePath) return 0;

    let bestMatch = -1;
    let bestMatchScore = 0;

    safeTabs.forEach((tab, index) => {
      if (!tab) return;
      let score = 0;
      const routeStr = String(tab?.route ?? '');

      // Exact route match gets highest score
      if (safePath === routeStr) {
        score = 100;
      }
      // Check if pathname starts with tab route (for nested routes)
      else if (routeStr && safePath.startsWith(routeStr)) {
        score = 80;
      }
      // Check if pathname contains the tab name
      else if (tab.name && safePath.includes(tab.name)) {
        score = 60;
      }
      // Check for partial matches in the route
      else if (routeStr.includes('/(tabs)/')) {
        const segment = routeStr.split('/(tabs)/')[1];
        if (segment && safePath.includes(segment)) {
          score = 40;
        }
      }

      if (score > bestMatchScore) {
        bestMatchScore = score;
        bestMatch = index;
      }
    });

    // Default to first tab if no match found
    return bestMatch >= 0 ? bestMatch : 0;
  }, [pathname, safeTabs]);

  React.useEffect(() => {
    if (activeTabIndex >= 0) {
      animatedValue.value = withSpring(activeTabIndex, {
        damping: 20,
        stiffness: 120,
        mass: 1,
      });
    }
  }, [activeTabIndex, animatedValue]);

  const indicatorStyle = useAnimatedStyle(() => {
    const len = safeTabs.length || 1;
    const tabWidth = (containerWidth - 8) / len;
    return {
      transform: [
        {
          translateX: interpolate(
            animatedValue.value,
            [0, len - 1],
            [0, tabWidth * (len - 1)]
          ),
        },
      ],
    };
  });

  const handleTabPress = (route: Href) => {
    console.log('[FloatingTabBar] Tab pressed, navigating to:', route);
    try {
      router.push(route);
    } catch (e) {
      console.warn('[FloatingTabBar] Navigation error:', e);
    }
  };

  if (safeTabs.length === 0) return null;

  // Remove unnecessary tabBarStyle animation to prevent flickering

  const tabWidthPercent = ((100 / safeTabs.length) - 1).toFixed(2);

  // Dynamic styles based on theme
  const dynamicStyles = {
    blurContainer: {
      ...styles.blurContainer,
      borderWidth: 1.2,
      borderColor: 'rgba(255, 255, 255, 1)',
      ...Platform.select({
        ios: {
          backgroundColor: theme.dark
            ? 'rgba(28, 28, 30, 0.8)'
            : 'rgba(255, 255, 255, 0.6)',
        },
        android: {
          backgroundColor: theme.dark
            ? 'rgba(28, 28, 30, 0.95)'
            : 'rgba(255, 255, 255, 0.6)',
        },
        web: {
          backgroundColor: theme.dark
            ? 'rgba(28, 28, 30, 0.95)'
            : 'rgba(255, 255, 255, 0.6)',
          backdropFilter: 'blur(10px)',
        },
      }),
    },
    background: {
      ...styles.background,
    },
    indicator: {
      ...styles.indicator,
      backgroundColor: theme.dark
        ? 'rgba(255, 255, 255, 0.08)' // Subtle white overlay in dark mode
        : 'rgba(0, 0, 0, 0.04)', // Subtle black overlay in light mode
      width: `${tabWidthPercent}%` as `${number}%`, // Dynamic width based on number of tabs
    },
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['bottom']}>
      <View style={[
        styles.container,
        {
          width: containerWidth,
          marginBottom: bottomMargin ?? 20
        }
      ]}>
        <BlurView
          intensity={80}
          style={[dynamicStyles.blurContainer, { borderRadius }]}
        >
          <View style={dynamicStyles.background} />
          <Animated.View style={[dynamicStyles.indicator, indicatorStyle]} />
          <View style={styles.tabsContainer}>
            {safeTabs.map((tab, index) => {
              if (!tab || !tab.route) return null;
              const isActive = activeTabIndex === index;

              return (
                <React.Fragment key={index}>
                <TouchableOpacity
                  key={index} // Use index as key
                  style={styles.tab}
                  onPress={() => tab?.route && handleTabPress(tab.route)}
                  activeOpacity={0.7}
                >
                  <View key={index} style={styles.tabContent}>
                    <IconSymbol
                      android_material_icon_name={tab.icon}
                      ios_icon_name={tab.icon}
                      size={24}
                      color={isActive ? COLORS.primary : COLORS.textSecondary}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        { color: COLORS.textTertiary },
                        isActive && { color: COLORS.primary, fontWeight: '600' },
                      ]}
                    >
                      {tab.label}
                    </Text>
                  </View>
                </TouchableOpacity>
                </React.Fragment>
              );
            })}
          </View>
        </BlurView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    alignItems: 'center', // Center the content
  },
  container: {
    marginHorizontal: 20,
    alignSelf: 'center',
    // width and marginBottom handled dynamically via props
  },
  blurContainer: {
    overflow: 'hidden',
    // borderRadius and other styling applied dynamically
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    // Dynamic styling applied in component
  },
  indicator: {
    position: 'absolute',
    top: 4,
    left: 2,
    bottom: 4,
    borderRadius: 27,
    width: `${(100 / 2) - 1}%`, // Default for 2 tabs, will be overridden by dynamic styles
    // Dynamic styling applied in component
  },
  tabsContainer: {
    flexDirection: 'row',
    height: 60,
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 2,
    // Dynamic styling applied in component
  },
});
