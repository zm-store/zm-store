import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen
        name="category/[slug]"
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primary,
          headerShadowVisible: false,
        }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerStyle: { backgroundColor: COLORS.background },
          headerTintColor: COLORS.primary,
          headerShadowVisible: false,
        }}
      />
    </Stack>
  );
}
