import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconSymbol } from '@/components/IconSymbol';
import { useLocalSearchParams, Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Minus, Plus, ShoppingBag, Heart, Star } from 'lucide-react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { COLORS } from '@/constants/Colors';
import { getProduct, Product } from '@/utils/zmstore';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/600x600/F4F6FB/0F1E47?text=Zm' };
  return { uri: source };
}

function ProductVideoPlayer({ videoUrl, title }: { videoUrl: string; title: string }) {
  const player = useVideoPlayer(videoUrl, (p) => {
    p.loop = true;
    p.pause();
  });

  return (
    <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 15,
          fontWeight: '700',
          color: COLORS.text,
          marginBottom: 10,
        }}
      >
        {title}
      </Text>
      <VideoView
        player={player}
        style={{
          width: '100%',
          aspectRatio: 16 / 9,
          borderRadius: 14,
          overflow: 'hidden',
          backgroundColor: '#000',
        }}
        contentFit="cover"
        nativeControls
      />
    </View>
  );
}

function AddToCartButton({
  label,
  inStock,
  onPress,
}: {
  label: string;
  inStock: boolean;
  onPress: () => void;
}) {
  const [pressed, setPressed] = useState(false);

  const gradientColors: [string, string] = pressed
    ? ['#FF5500', '#FF2200']
    : ['#FF9900', '#FF5500'];

  if (!inStock) {
    return (
      <View
        style={{
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 24,
          height: 54,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          backgroundColor: '#9CA3AF',
        }}
        accessible
        accessibilityRole="button"
        accessibilityState={{ disabled: true }}
      >
        <IconSymbol
          android_material_icon_name="shopping-cart"
          size={20}
          color="#FFFFFF"
        />
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
          {label}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      onPress={() => {
        console.log('[AddToCartButton] Pressed: Add to Cart');
        onPress();
      }}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      accessible
      accessibilityRole="button"
      style={({ pressed: p }) => ({ opacity: p ? 0.97 : 1 })}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          borderRadius: 12,
          paddingVertical: 12,
          paddingHorizontal: 24,
          height: 54,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          shadowColor: '#FF5500',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
          elevation: 6,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        }}
      >
        <IconSymbol
          android_material_icon_name="shopping-cart"
          size={20}
          color="#FFFFFF"
        />
        <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
          {label}
        </Text>
      </LinearGradient>
    </Pressable>
  );
}

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();
  const { t } = useLanguage();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addedToast, setAddedToast] = useState(false);

  useEffect(() => {
    if (!id) return;
    console.log(`[ProductDetail] Loading product: ${id}`);
    getProduct(id)
      .then((p) => {
        setProduct(p);
        setError(null);
      })
      .catch((e) => {
        console.error('[ProductDetail] Load error:', e);
        setError(t('product.not_found'));
      })
      .finally(() => setLoading(false));
  }, [id, t]);

  const handleToggleFavorite = () => {
    if (!id) return;
    console.log(`[ProductDetail] Toggle favorite: ${id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(id);
  };

  const handleAddToCart = () => {
    if (!product) return;
    console.log(`[ProductDetail] Add to cart: ${product.name} x${quantity}`);
    addItem(
      { id: product.id, name: product.name, image_url: product.image_url, price: product.price },
      quantity
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddedToast(true);
    setTimeout(() => setAddedToast(false), 2000);
  };

  const decreaseQty = () => {
    console.log('[ProductDetail] Decrease quantity');
    setQuantity((q) => Math.max(1, q - 1));
  };

  const increaseQty = () => {
    console.log('[ProductDetail] Increase quantity');
    setQuantity((q) => q + 1);
  };

  const errorTitle = t('product.error_title');
  const inStockLabel = t('product.in_stock');
  const outOfStockLabel = t('product.out_of_stock');
  const quantityLabel = t('product.quantity');
  const addToCartLabel = t('product.add_to_cart');
  const addedToastLabel = t('product.added_toast');
  const videoTitleLabel = t('product.video_title');
  const pointsEarnLabel = t('product.points_earn');
  const pointsShortLabel = t('product.points_short');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: '' }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ title: errorTitle }} />
        <Text style={{ color: COLORS.danger, fontSize: 16, textAlign: 'center' }}>
          {error ?? t('product.not_found')}
        </Text>
      </View>
    );
  }

  const stockLabel = product.in_stock ? inStockLabel : outOfStockLabel;
  const cartBtnLabel = product.in_stock ? addToCartLabel : outOfStockLabel;
  const favorited = isFavorite(id ?? '');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen
        options={{
          title: product.name,
          headerRight: () => (
            <TouchableOpacity
              onPress={handleToggleFavorite}
              activeOpacity={0.7}
              style={{ padding: 4 }}
            >
              <Heart
                size={22}
                color={favorited ? COLORS.danger : COLORS.textSecondary}
                fill={favorited ? COLORS.danger : 'transparent'}
                strokeWidth={2}
              />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Product image */}
        <Image
          source={resolveImageSource(product.image_url)}
          style={{ width: '100%', aspectRatio: 1 }}
          resizeMode="cover"
        />

        {/* Video player */}
        {product.video_url ? (
          <ProductVideoPlayer videoUrl={product.video_url} title={videoTitleLabel} />
        ) : null}

        <View style={{ padding: 20 }}>
          {/* Name */}
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: COLORS.text,
              letterSpacing: -0.3,
              marginBottom: 8,
            }}
          >
            {product.name}
          </Text>

          {/* Price + points */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
            <PriceText value={product.price} size={20} />
            {product.points_per_purchase > 0 ? (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 4,
                  backgroundColor: 'rgba(217,119,6,0.1)',
                  borderRadius: 20,
                  paddingHorizontal: 10,
                  paddingVertical: 4,
                  borderWidth: 1,
                  borderColor: 'rgba(217,119,6,0.25)',
                }}
              >
                <Star size={13} color={COLORS.warning} fill={COLORS.warning} />
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.warning }}>
                  {pointsEarnLabel}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.warning }}>
                  +{product.points_per_purchase}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.warning }}>
                  {pointsShortLabel}
                </Text>
              </View>
            ) : null}
          </View>

          {/* Stock badge */}
          <View
            style={{
              alignSelf: 'flex-start',
              backgroundColor: product.in_stock
                ? 'rgba(22, 163, 74, 0.12)'
                : 'rgba(220, 38, 38, 0.12)',
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 4,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                fontSize: 13,
                fontWeight: '600',
                color: product.in_stock ? COLORS.success : COLORS.danger,
              }}
            >
              {stockLabel}
            </Text>
          </View>

          {/* Description */}
          {product.description ? (
            <View
              style={{
                backgroundColor: COLORS.surfaceSecondary,
                borderRadius: 12,
                padding: 14,
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.textSecondary,
                  lineHeight: 24,
                }}
              >
                {product.description}
              </Text>
            </View>
          ) : null}

          {/* Quantity stepper */}
          {product.in_stock && (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>
                {quantityLabel}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
                <AnimatedPressable
                  onPress={decreaseQty}
                  disabled={quantity <= 1}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: COLORS.surfaceSecondary,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Minus size={18} color={COLORS.text} />
                </AnimatedPressable>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: COLORS.text,
                    minWidth: 24,
                    textAlign: 'center',
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {quantity}
                </Text>
                <AnimatedPressable
                  onPress={increaseQty}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={18} color={COLORS.primary} />
                </AnimatedPressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add to cart button */}
      <View
        style={{
          position: 'absolute',
          bottom: insets.bottom + 90,
          left: 16,
          right: 16,
        }}
      >
        <AddToCartButton
          label={cartBtnLabel}
          inStock={product.in_stock}
          onPress={handleAddToCart}
        />
      </View>

      {/* Toast */}
      {addedToast && (
        <View
          style={{
            position: 'absolute',
            bottom: insets.bottom + 160,
            left: 32,
            right: 32,
            backgroundColor: COLORS.success,
            borderRadius: 12,
            padding: 12,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 14 }}>
            {addedToastLabel}
          </Text>
        </View>
      )}
    </View>
  );
}
