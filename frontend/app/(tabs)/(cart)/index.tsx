import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Minus, Plus, Trash2, ShoppingBag } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { EmptyState } from '@/components/EmptyState';
import { COLORS } from '@/constants/Colors';
import { useCart, CartItem } from '@/contexts/CartContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '@/hooks/useAppSettings';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/100x100/F1ECE4/7A4A2B?text=Zm' };
  return { uri: source };
}

function CartItemRow({ item }: { item: CartItem }) {
  const { setQuantity, removeItem } = useCart();

  const handleDecrease = () => {
    console.log(`[Cart] Decrease qty for ${item.product_id}`);
    setQuantity(item.product_id, item.quantity - 1);
  };

  const handleIncrease = () => {
    console.log(`[Cart] Increase qty for ${item.product_id}`);
    setQuantity(item.product_id, item.quantity + 1);
  };

  const handleRemove = () => {
    console.log(`[Cart] Remove item ${item.product_id}`);
    removeItem(item.product_id);
  };

  const lineTotal = item.unit_price * item.quantity;

  return (
    <View
      style={{
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
        boxShadow: '0 1px 3px rgba(27,23,20,0.04)',
      }}
    >
      <Image
        source={resolveImageSource(item.image_url)}
        style={{ width: 72, height: 72, borderRadius: 10 }}
        resizeMode="cover"
      />
      <View style={{ flex: 1 }}>
        <Text
          style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 4 }}
          numberOfLines={2}
        >
          {item.name}
        </Text>
        <PriceText value={item.unit_price} size={13} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <AnimatedPressable
              onPress={handleDecrease}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Minus size={14} color={COLORS.text} />
            </AnimatedPressable>
            <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, minWidth: 20, textAlign: 'center' }}>
              {item.quantity}
            </Text>
            <AnimatedPressable
              onPress={handleIncrease}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Plus size={14} color={COLORS.primary} />
            </AnimatedPressable>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PriceText value={lineTotal} size={14} />
            <AnimatedPressable
              onPress={handleRemove}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                backgroundColor: 'rgba(192,57,43,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Trash2 size={14} color={COLORS.danger} />
            </AnimatedPressable>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen() {
  const { items, total } = useCart();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { deliveryFee, serviceFee } = useAppSettings();
  const { t } = useLanguage();

  const grandTotal = total + deliveryFee + serviceFee;

  const handleCheckout = () => {
    console.log('[Cart] Proceed to checkout pressed');
    router.push('/(tabs)/(cart)/checkout');
  };

  const handleStartShopping = () => {
    console.log('[Cart] Start shopping pressed');
    router.push('/(tabs)/(home)');
  };

  const emptyTitle = t('cart.empty_title');
  const emptySubtitle = t('cart.empty_subtitle');
  const startShoppingLabel = t('cart.start_shopping');
  const subtotalLabel = t('cart.subtotal');
  const deliveryLabel = t('cart.delivery_fee');
  const serviceLabel = t('cart.service_fee');
  const grandTotalLabel = t('cart.grand_total');
  const checkoutLabel = t('cart.proceed_checkout');

  if (items.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <EmptyState
          icon={<ShoppingBag size={32} color={COLORS.primary} />}
          title={emptyTitle}
          subtitle={emptySubtitle}
          ctaLabel={startShoppingLabel}
          onCta={handleStartShopping}
        />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.product_id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 220 }}
        renderItem={({ item }) => <CartItemRow item={item} />}
      />

      {/* Sticky bottom */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          padding: 16,
          paddingBottom: insets.bottom + 90,
          boxShadow: '0 -4px 16px rgba(27,23,20,0.06)',
        }}
      >
        {/* Subtotal row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <PriceText value={total} size={14} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{subtotalLabel}</Text>
        </View>

        {/* Delivery fee row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
          <PriceText value={deliveryFee} size={14} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{deliveryLabel}</Text>
        </View>

        {/* Service fee row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
          <PriceText value={serviceFee} size={14} color={COLORS.textSecondary} />
          <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{serviceLabel}</Text>
        </View>

        {/* Divider */}
        <View style={{ height: 1, backgroundColor: COLORS.divider, marginBottom: 10 }} />

        {/* Grand total row */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
          <PriceText value={grandTotal} size={18} />
          <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text }}>{grandTotalLabel}</Text>
        </View>

        <AnimatedPressable
          onPress={handleCheckout}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
            {checkoutLabel}
          </Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}
