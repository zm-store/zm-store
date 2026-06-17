import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useWishlist } from '@/contexts/WishlistContext';
import { ProductCard } from '@/components/ProductCard';
import { COLORS } from '@/constants/Colors';
import { listProducts, Product } from '@/utils/zmstore';
import { useLanguage } from '@/lib/i18n';
import { Heart } from 'lucide-react-native';

export default function WishlistScreen() {
  const { favoriteIds } = useWishlist();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[Wishlist] Loading all products for wishlist filter');
    listProducts()
      .then((products) => {
        setAllProducts(products);
      })
      .catch((e) => {
        console.error('[Wishlist] Failed to load products:', e);
      })
      .finally(() => setLoading(false));
  }, []);

  const wishlistProducts = allProducts.filter((p) => favoriteIds.has(p.id));

  const emptyLabel = t('wishlist.empty');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (wishlistProducts.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}
        >
          <Heart size={32} color={COLORS.textTertiary} />
        </View>
        <Text
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: COLORS.textSecondary,
            textAlign: 'center',
          }}
        >
          {emptyLabel}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={wishlistProducts}
      keyExtractor={(item) => item.id}
      numColumns={2}
      contentContainerStyle={{
        padding: 12,
        paddingBottom: insets.bottom + 24,
        gap: 12,
      }}
      columnWrapperStyle={{ gap: 12 }}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }) => (
        <View style={{ flex: 1 }}>
          <ProductCard product={item} index={index} />
        </View>
      )}
    />
  );
}
