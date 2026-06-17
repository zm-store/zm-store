import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useLanguage } from '@/lib/i18n';

export default function AdminLayout() {
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
      <Stack.Screen name="index" options={{ title: t('admin.title') }} />
      <Stack.Screen name="products" options={{ title: t('admin.products_title') }} />
      <Stack.Screen name="product-edit" options={{ title: t('admin.product_edit_title') }} />
      <Stack.Screen name="banners" options={{ title: t('admin.banners_title') }} />
      <Stack.Screen name="banner-edit" options={{ title: t('admin.banner_edit_title') }} />
      <Stack.Screen name="orders" options={{ title: t('admin.orders_title') }} />
      <Stack.Screen name="order/[id]" options={{ title: t('admin.order_detail_title') }} />
      <Stack.Screen name="categories" options={{ title: t('admin.categories_title') }} />
      <Stack.Screen name="category-edit" options={{ title: t('admin.category_edit_title') }} />
      <Stack.Screen name="settings" options={{ title: t('admin.settings_title') }} />
      <Stack.Screen name="notifications" options={{ title: t('admin.notifications_title') }} />
    </Stack>
  );
}
