import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { ShoppingBag } from 'lucide-react-native';
import { ProductCard } from '@/components/ProductCard';
import { EmptyState } from '@/components/EmptyState';
import { CardSkeleton } from '@/components/LoadingScreen';
import { COLORS } from '@/constants/Colors';
import { listProducts, listCategories, Product, Category } from '@/utils/zmstore';
import { useLanguage } from '@/lib/i18n';

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { width } = useWindowDimensions();
  const cardWidth = (width - 16 * 2 - 12) / 2;
  const { t } = useLanguage();

  const [products, setProducts] = useState<Product[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!slug) return;
    console.log(`[CategoryScreen] Loading products for slug: ${slug}`);
    try {
      const [productsData, categoriesData] = await Promise.all([
        listProducts(slug),
        listCategories().catch(() => [] as Category[]),
      ]);
      setProducts(productsData);
      const cat = categoriesData.find((c) => c.slug === slug);
      setCategory(cat ?? null);
      setError(null);
    } catch (e: any) {
      console.error('[CategoryScreen] Load error:', e);
      setError(t('category.error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = () => {
    console.log('[CategoryScreen] Pull to refresh');
    setRefreshing(true);
    loadData();
  };

  const categoryTitle = category?.name_ku ?? String(slug ?? '');
  const emptyTitle = t('category.empty_title');
  const emptySubtitle = t('category.empty_subtitle');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 16 }}>
        <Stack.Screen options={{ title: categoryTitle }} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ width: cardWidth }}>
              <CardSkeleton />
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: categoryTitle }} />
      {error ? (
        <View
          style={{
            margin: 16,
            padding: 12,
            backgroundColor: 'rgba(192,57,43,0.08)',
            borderRadius: 12,
          }}
        >
          <Text style={{ color: COLORS.danger, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: 120,
        }}
        columnWrapperStyle={{ gap: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ShoppingBag size={32} color={COLORS.primary} />}
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        }
        renderItem={({ item, index }) => (
          <ProductCard product={item} index={index} width={cardWidth} />
        )}
      />
    </View>
  );
}
