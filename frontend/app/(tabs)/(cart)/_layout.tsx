import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useLanguage } from '@/lib/i18n';

export default function CartLayout() {
  const { t } = useLanguage();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.background },
      }}
    >
      <Stack.Screen name="index" options={{ title: t('cart.title'), headerBackButtonDisplayMode: 'minimal' }} />
      <Stack.Screen name="checkout" options={{ title: t('cart.checkout_title'), headerBackButtonDisplayMode: 'minimal' }} />
    </Stack>
  );
}
