import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useLanguage } from '@/lib/i18n';

export default function ProfileLayout() {
  const { t } = useLanguage();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.primary,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: COLORS.background },
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <Stack.Screen name="index" options={{ title: t('profile.title') }} />
      <Stack.Screen name="edit" options={{ title: t('profile.edit_title') }} />
      <Stack.Screen name="wishlist" options={{ title: t('wishlist.title') }} />
      <Stack.Screen name="orders" options={{ title: t('profile.orders_title') }} />
      <Stack.Screen name="order/[id]" options={{ title: t('profile.order_detail_title') }} />
      <Stack.Screen name="admin/index" options={{ title: t('admin.title') }} />
      <Stack.Screen name="admin/products" options={{ title: t('admin.products_title') }} />
      <Stack.Screen name="admin/product-edit" options={{ title: t('admin.product_edit_title') }} />
      <Stack.Screen name="admin/banners" options={{ title: t('admin.banners_title') }} />
      <Stack.Screen name="admin/banner-edit" options={{ title: t('admin.banner_edit_title') }} />
      <Stack.Screen name="admin/orders" options={{ title: t('admin.orders_title') }} />
      <Stack.Screen name="admin/order/[id]" options={{ title: t('admin.order_detail_title') }} />
      <Stack.Screen name="privacy" options={{ title: t('profile.privacy_title') }} />
    </Stack>
  );
}
