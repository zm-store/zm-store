import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageSourcePropType,
  Modal,
  Switch,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, Pencil, Trash2, Image as ImageIcon } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { EmptyState } from '@/components/EmptyState';
import { COLORS } from '@/constants/Colors';
import { adminListBanners, adminUpdateBanner, adminDeleteBanner, Banner } from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/120x60/F4F6FB/0F1E47?text=Banner' };
  return { uri: source };
}

export default function AdminBannersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Banner | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadBanners = useCallback(async () => {
    console.log('[AdminBanners] Loading banners...');
    try {
      const data = await adminListBanners();
      setBanners(data.sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) {
      console.error('[AdminBanners] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadBanners();
  }, [loadBanners]);

  const handleToggleActive = async (banner: Banner) => {
    console.log(`[AdminBanners] Toggle active for ${banner.id}: ${!banner.active}`);
    try {
      const updated = await adminUpdateBanner(banner.id, { active: !banner.active });
      setBanners((prev) => prev.map((b) => (b.id === banner.id ? updated : b)));
    } catch (e) {
      console.error('[AdminBanners] Toggle error:', e);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    console.log(`[AdminBanners] Delete banner: ${deleteTarget.id}`);
    setDeleting(true);
    try {
      await adminDeleteBanner(deleteTarget.id);
      setBanners((prev) => prev.filter((b) => b.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error('[AdminBanners] Delete error:', e);
    } finally {
      setDeleting(false);
    }
  };

  const emptyTitle = t('admin.banners_empty_title');
  const emptySubtitle = t('admin.banners_empty_subtitle');
  const deleteTitleText = t('admin.banner_delete_title');
  const deleteIrreversibleText = t('admin.banner_delete_irreversible');
  const cancelText = t('common.cancel');
  const deleteText = t('common.delete');
  const activeLabel = t('admin.banner_active_label');
  const sortLabel = t('admin.banner_sort_label');

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
        data={banners}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadBanners(); }} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ImageIcon size={32} color={COLORS.primary} />}
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        }
        renderItem={({ item }) => (
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
              style={{ width: 80, height: 50, borderRadius: 8 }}
              resizeMode="cover"
            />
            <View style={{ flex: 1 }}>
              {item.title ? (
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
                  {item.title}
                </Text>
              ) : null}
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                {sortLabel}: {item.sort_order}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>{activeLabel}</Text>
                <Switch
                  value={item.active}
                  onValueChange={() => handleToggleActive(item)}
                  trackColor={{ false: COLORS.border, true: COLORS.primary }}
                  thumbColor="#FFF"
                  style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                />
              </View>
            </View>
            <View style={{ gap: 8 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log(`[AdminBanners] Edit banner: ${item.id}`);
                  router.push(`/(tabs)/(profile)/admin/banner-edit?id=${item.id}`);
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
                  console.log(`[AdminBanners] Delete target set: ${item.id}`);
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
        )}
      />

      {/* FAB */}
      <AnimatedPressable
        onPress={() => {
          console.log('[AdminBanners] Add new banner pressed');
          router.push('/(tabs)/(profile)/admin/banner-edit');
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

      {/* Delete modal */}
      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={() => setDeleteTarget(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: COLORS.surface, borderRadius: 20, padding: 24, width: '100%', maxWidth: 340 }}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 8, textAlign: 'center' }}>
              سڕینەوەی ڕیکلام
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              دڵنیای لە سڕینەوەی ئەم ڕیکلامە؟ ئەم کارە گەڕانەوەی نییە.
            </Text>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <AnimatedPressable
                onPress={() => {
                  console.log('[AdminBanners] Delete cancelled');
                  setDeleteTarget(null);
                }}
                style={{ flex: 1, backgroundColor: COLORS.surfaceSecondary, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>نەخێر</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleDelete}
                disabled={deleting}
                style={{ flex: 1, backgroundColor: COLORS.danger, borderRadius: 12, height: 48, alignItems: 'center', justifyContent: 'center' }}
              >
                {deleting ? <ActivityIndicator color="#FFF" size="small" /> : (
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
