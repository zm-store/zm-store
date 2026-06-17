import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageSourcePropType,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Pencil, Trash2, Package } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { EmptyState } from '@/components/EmptyState';
import { COLORS } from '@/constants/Colors';
import { adminListProducts, adminDeleteProduct, Product } from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/80x80/F4F6FB/0F1E47?text=Zm' };
  return { uri: source };
}

export default function AdminProductsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadProducts = useCallback(async () => {
    console.log('[AdminProducts] Loading products...');
    try {
      const data = await adminListProducts();
      setProducts(data);
    } catch (e) {
      console.error('[AdminProducts] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    console.log(`[AdminProducts] Delete product: ${deleteTarget.id}`);
    setDeleting(true);
    try {
      await adminDeleteProduct(deleteTarget.id);
      setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error('[AdminProducts] Delete error:', e);
    } finally {
      setDeleting(false);
    }
  };

  const emptyTitle = t('admin.products_empty_title');
  const emptySubtitle = t('admin.products_empty_subtitle');
  const deleteTitleText = t('admin.product_delete_title');
  const deleteIrreversibleText = t('admin.product_delete_irreversible');
  const cancelText = t('common.cancel');
  const deleteText = t('common.delete');
  const inStockText = t('admin.product_in_stock');
  const outOfStockText = t('admin.product_out_of_stock');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadProducts(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Package size={32} color={COLORS.primary} />}
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        }
        renderItem={({ item }) => {
          const stockLabel = item.in_stock ? inStockText : outOfStockText;
          return (
            <View
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <Image
                source={resolveImageSource(item.image_url)}
                style={{ width: 60, height: 60, borderRadius: 10 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
                  {item.name}
                </Text>
                <PriceText value={item.price} size={13} style={{ marginTop: 2 }} />
                <View
                  style={{
                    alignSelf: 'flex-start',
                    backgroundColor: item.in_stock ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)',
                    borderRadius: 6,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    marginTop: 4,
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: item.in_stock ? COLORS.success : COLORS.danger }}>
                    {stockLabel}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <AnimatedPressable
                  onPress={() => {
                    console.log(`[AdminProducts] Edit product: ${item.id}`);
                    router.push(`/(tabs)/(profile)/admin/product-edit?id=${item.id}`);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Pencil size={16} color={COLORS.primary} />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={() => {
                    console.log(`[AdminProducts] Delete target set: ${item.id}`);
                    setDeleteTarget(item);
                  }}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: 'rgba(220,38,38,0.1)',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Trash2 size={16} color={COLORS.danger} />
                </AnimatedPressable>
              </View>
            </View>
          );
        }}
      />

      {/* FAB */}
      <AnimatedPressable
        onPress={() => {
          console.log('[AdminProducts] Add new product pressed');
          router.push('/(tabs)/(profile)/admin/product-edit');
        }}
        style={{
          position: 'absolute',
          bottom: insets.bottom + 90,
          right: 16,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: COLORS.primary,
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(15,30,71,0.3)',
        }}
      >
        <Plus size={24} color="#FFF" />
      </AnimatedPressable>

      {/* Delete confirmation modal */}
      <Modal
        visible={!!deleteTarget}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteTarget(null)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(0,0,0,0.5)',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <View
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 20,
              padding: 24,
              width: '100%',
              maxWidth: 340,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' }}>
              سڕینەوەی بەرهەم
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>
              {deleteTarget?.name}
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              دڵنیای لە سڕینەوەی ئەم بەرهەمە؟ ئەم کارە گەڕانەوەی نییە.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[AdminProducts] Delete cancelled');
                  setDeleteTarget(null);
                }}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>نەخێر</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.danger,
                  borderRadius: 12,
                  height: 48,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {deleting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>بەڵێ، بسڕەوە</Text>
                )}
              </AnimatedPressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
