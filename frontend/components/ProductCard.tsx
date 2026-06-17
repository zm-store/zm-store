import React, { useRef, useEffect } from 'react';
import { View, Text, Image, Animated, ImageSourcePropType, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Plus, Heart, Star } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { useCart } from '@/contexts/CartContext';
import { useWishlist } from '@/contexts/WishlistContext';
import { COLORS } from '@/constants/Colors';
import { Product } from '@/utils/zmstore';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/300x300/F4F6FB/0F1E47?text=Zm' };
  return { uri: source };
}

interface ProductCardProps {
  product: Product;
  index?: number;
  width?: number;
}

export function ProductCard({ product, index = 0, width }: ProductCardProps) {
  const router = useRouter();
  const { addItem } = useCart();
  const { isFavorite, toggleFavorite } = useWishlist();
  const { t } = useLanguage();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const handleAddToCart = () => {
    console.log(`[ProductCard] Add to cart: ${product.name}`);
    addItem({
      id: product.id,
      name: product.name,
      image_url: product.image_url,
      price: product.price,
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handlePress = () => {
    console.log(`[ProductCard] Navigate to product: ${product.id}`);
    router.push(`/(tabs)/(home)/product/${product.id}`);
  };

  const handleToggleFavorite = (e: any) => {
    e.stopPropagation();
    console.log(`[ProductCard] Toggle favorite: ${product.id}`);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleFavorite(product.id);
  };

  const cardWidth = width ?? 160;
  const outOfStockLabel = t('product.out_of_stock');
  const pointsShortLabel = t('product.points_short');
  const favorited = isFavorite(product.id);
  const showPoints = (product.points_per_purchase ?? 0) > 0;

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }] }}>
      <AnimatedPressable
        onPress={handlePress}
        style={{
          width: cardWidth,
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          overflow: 'hidden',
          borderWidth: 1,
          borderColor: COLORS.border,
          boxShadow: '0 1px 3px rgba(15,30,71,0.04), 0 4px 12px rgba(15,30,71,0.03)',
        }}
      >
        <Image
          source={resolveImageSource(product.image_url)}
          style={{ width: cardWidth, height: cardWidth * 0.75 }}
          resizeMode="cover"
        />

        {/* Heart button — top left */}
        <TouchableOpacity
          onPress={handleToggleFavorite}
          activeOpacity={0.8}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.15,
            shadowRadius: 3,
            elevation: 3,
          }}
        >
          <Heart
            size={15}
            color={favorited ? COLORS.danger : '#8A93AB'}
            fill={favorited ? COLORS.danger : 'transparent'}
            strokeWidth={2}
          />
        </TouchableOpacity>

        {/* Out of stock badge — top right */}
        {!product.in_stock && (
          <View
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              backgroundColor: COLORS.danger,
              borderRadius: 6,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '600' }}>{outOfStockLabel}</Text>
          </View>
        )}

        <View style={{ padding: 10 }}>
          <Text
            style={{
              fontSize: 13,
              fontWeight: '600',
              color: COLORS.text,
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {product.name}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <PriceText value={product.price} size={13} />
            {product.in_stock && (
              <AnimatedPressable
                onPress={handleAddToCart}
                scaleValue={0.9}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Plus size={16} color="#FFF" strokeWidth={2.5} />
              </AnimatedPressable>
            )}
          </View>
          {showPoints ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                marginTop: 5,
                backgroundColor: 'rgba(217,119,6,0.1)',
                borderRadius: 10,
                paddingHorizontal: 7,
                paddingVertical: 3,
                alignSelf: 'flex-start',
              }}
            >
              <Star size={10} color={COLORS.warning} fill={COLORS.warning} />
              <Text style={{ fontSize: 10, fontWeight: '700', color: COLORS.warning }}>
                +{product.points_per_purchase}
              </Text>
              <Text style={{ fontSize: 10, fontWeight: '600', color: COLORS.warning }}>
                {pointsShortLabel}
              </Text>
            </View>
          ) : null}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}
