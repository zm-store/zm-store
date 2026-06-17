import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Pencil, Plus } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { EmptyState } from '@/components/EmptyState';
import { COLORS } from '@/constants/Colors';
import { adminListCategories, Category } from '@/utils/zmstore';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function CategoryThumbnail({ category }: { category: Category }) {
  const firstChar = (category.name_ku ?? '?')[0];

  if (category.image_url) {
    return (
      <Image
        source={resolveImageSource(category.image_url)}
        style={{
          width: 56,
          height: 56,
          borderRadius: 12,
          backgroundColor: COLORS.surfaceSecondary,
        }}
        resizeMode="cover"
      />
    );
  }

  return (
    <View
      style={{
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: COLORS.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 22, color: COLORS.primary }}>{firstChar}</Text>
    </View>
  );
}

function SkeletonRow() {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
      }}
    >
      <View style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: COLORS.surfaceSecondary }} />
      <View style={{ flex: 1, gap: 6 }}>
        <View style={{ height: 14, width: '60%', borderRadius: 6, backgroundColor: COLORS.surfaceSecondary }} />
        <View style={{ height: 12, width: '40%', borderRadius: 6, backgroundColor: COLORS.surfaceSecondary }} />
        <View style={{ height: 10, width: '30%', borderRadius: 6, backgroundColor: COLORS.surfaceSecondary }} />
      </View>
    </View>
  );
}

function CategoryRow({ category, onEdit }: { category: Category; onEdit: () => void }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
      }}
    >
      <CategoryThumbnail category={category} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>{category.name_ku}</Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginTop: 2 }}>{category.name_en}</Text>
        <Text
          style={{
            fontSize: 11,
            color: COLORS.textTertiary,
            marginTop: 2,
            fontFamily: 'monospace',
          }}
        >
          {category.slug}
        </Text>
      </View>
      <AnimatedPressable
        onPress={onEdit}
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
    </View>
  );
}

export default function AdminCategoriesScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCategories = useCallback(async () => {
    console.log('[AdminCategories] Loading categories...');
    try {
      const data = await adminListCategories();
      setCategories(data.sort((a, b) => a.sort_order - b.sort_order));
      setError(null);
    } catch (e: any) {
      console.error('[AdminCategories] Load error:', e);
      setError(t('admin.categories_error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleRefresh = () => {
    console.log('[AdminCategories] Pull to refresh');
    setRefreshing(true);
    loadCategories();
  };

  const handleEdit = (category: Category) => {
    console.log(`[AdminCategories] Edit category: ${category.id}`);
    router.push(`/(tabs)/(profile)/admin/category-edit?id=${category.id}`);
  };

  const handleCreate = () => {
    console.log('[AdminCategories] Create new category pressed');
    router.push('/(tabs)/(profile)/admin/category-edit');
  };

  const emptyTitle = t('admin.categories_empty_title');
  const emptySubtitle = t('admin.categories_empty_subtitle');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 16, gap: 10 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonRow key={i} />
        ))}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {error ? (
        <View
          style={{
            margin: 16,
            padding: 12,
            backgroundColor: 'rgba(220,38,38,0.08)',
            borderRadius: 12,
          }}
        >
          <Text style={{ color: COLORS.danger, textAlign: 'center', fontSize: 14 }}>{error}</Text>
        </View>
      ) : null}

      <FlatList
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<Text style={{ fontSize: 32 }}>📂</Text>}
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        }
        renderItem={({ item }) => (
          <CategoryRow category={item} onEdit={() => handleEdit(item)} />
        )}
      />

      {/* FAB */}
      <AnimatedPressable
        onPress={handleCreate}
        style={{
          position: 'absolute',
          bottom: 32,
          left: 24,
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
    </View>
  );
}
