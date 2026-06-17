import "react-native-reanimated";
import React, { useEffect } from "react";
import { Stack, router } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nManager, View, ActivityIndicator } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  Theme,
  ThemeProvider,
} from "@react-navigation/native";
import { useColorScheme } from "react-native";
import { StatusBar } from "expo-status-bar";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { LanguageProvider } from "@/lib/i18n";
import { COLORS } from "@/constants/Colors";

// Force RTL for Kurdish Sorani
I18nManager.allowRTL(true);
I18nManager.forceRTL(true);

const DevErrorBoundary: React.ComponentType<{ children: React.ReactNode }> = __DEV__
  ? ErrorBoundary
  : ({ children }: { children: React.ReactNode }) => <>{children}</>;

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      console.log("[AuthGate] No user detected, redirecting to auth-screen");
      router.replace("/auth-screen");
    }
  }, [loading, user]);

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!user) return null;
  return <>{children}</>;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [iconsLoaded, iconsError] = useIconFonts();

  useEffect(() => {
    if (iconsLoaded || iconsError) {
      SplashScreen.hideAsync();
    }
  }, [iconsLoaded, iconsError]);

  const CustomDefaultTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      primary: COLORS.primary,
      background: COLORS.background,
      card: COLORS.surface,
      text: COLORS.text,
      border: COLORS.border,
      notification: COLORS.danger,
    },
  };

  const CustomDarkTheme: Theme = {
    ...DarkTheme,
    colors: {
      primary: COLORS.accent,
      background: "#0A1228",
      card: "#132042",
      text: "#FFFFFF",
      border: "rgba(255,255,255,0.08)",
      notification: COLORS.danger,
    },
  };

  if (!iconsLoaded && !iconsError) return null;

  return (
    <DevErrorBoundary>
      <StatusBar style="light" animated />
      <ThemeProvider value={colorScheme === "dark" ? CustomDarkTheme : CustomDefaultTheme}>
        <SafeAreaProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <LanguageProvider>
              <AuthProvider>
                <CartProvider>
                  <WishlistProvider>
                    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }} />
                  </WishlistProvider>
                </CartProvider>
              </AuthProvider>
            </LanguageProvider>
          </GestureHandlerRootView>
        </SafeAreaProvider>
      </ThemeProvider>
    </DevErrorBoundary>
  );
}
