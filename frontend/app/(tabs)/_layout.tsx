import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import FloatingTabBar from '@/components/FloatingTabBar';
import { useCart } from '@/contexts/CartContext';
import { COLORS } from '@/constants/Colors';
import { useLanguage } from '@/lib/i18n';

function TabsLayout() {
  const { count } = useCart();
  const { t } = useLanguage();

  const tabItems = React.useMemo(() => [
    {
      name: '(home)',
      route: '/(tabs)/(home)' as const,
      icon: 'home' as const,
      label: t('tabs.home') || 'Home',
    },
    {
      name: '(cart)',
      route: '/(tabs)/(cart)' as const,
      icon: 'shopping-bag' as const,
      label: t('tabs.cart') || 'Cart',
    },
    {
      name: '(profile)',
      route: '/(tabs)/(profile)' as const,
      icon: 'person' as const,
      label: t('tabs.profile') || 'Profile',
    },
  ], [t]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack initialRouteName="(home)" screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Screen name="(home)" />
        <Stack.Screen name="(cart)" />
        <Stack.Screen name="(profile)" />
      </Stack>

      {/* Custom floating tab bar */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <FloatingTabBar
          tabs={tabItems.filter((tab) => tab && tab.route).map((tab) => ({ ...tab, route: tab.route }))}
          containerWidth={320}
          borderRadius={35}
          bottomMargin={20}
        />
        {/* Cart badge overlay */}
        {count > 0 && (
          <View
            style={{
              position: 'absolute',
              bottom: 52,
              left: '50%',
              marginLeft: -4,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: COLORS.danger,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1001,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '700' }}>
              {count > 9 ? '9+' : String(count)}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default TabsLayout;
