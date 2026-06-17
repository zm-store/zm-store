import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import {
  getProduct,
  listCategories,
  adminCreateProduct,
  adminUpdateProduct,
  Category,
  Product,
} from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric' | 'phone-pad';
  multiline?: boolean;
  error?: string;
}) {
  return (
    <View>
      <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        style={{
          backgroundColor: COLORS.surfaceSecondary,
          borderRadius: 12,
          padding: 14,
          fontSize: 15,
          color: COLORS.text,
          borderWidth: 1,
          borderColor: error ? COLORS.danger : COLORS.border,
          minHeight: multiline ? 80 : undefined,
          textAlignVertical: multiline ? 'top' : undefined,
        }}
      />
      {error ? (
        <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{error}</Text>
      ) : null}
    </View>
  );
}

export default function ProductEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const isEdit = !!id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [inStock, setInStock] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const init = async () => {
      console.log(`[ProductEdit] Init, isEdit=${isEdit}, id=${id}`);
      try {
        const cats = await listCategories();
        setCategories(cats);
        if (isEdit && id) {
          const product = await getProduct(id);
          setName(product.name);
          setDescription(product.description ?? '');
          setPrice(String(product.price));
          setImageUrl(product.image_url ?? '');
          setVideoUrl(product.video_url ?? '');
          setInStock(product.in_stock);
          setSelectedCategoryId(product.category_id);
        } else if (cats.length > 0) {
          setSelectedCategoryId(cats[0].id);
        }
      } catch (e) {
        console.error('[ProductEdit] Init error:', e);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id, isEdit]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t('admin.product_error_name');
    if (!price.trim() || isNaN(Number(price))) newErrors.price = t('admin.product_error_price');
    if (!selectedCategoryId) newErrors.category = t('admin.product_error_category');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log(`[ProductEdit] Save pressed, isEdit=${isEdit}`);
    if (!validate()) return;
    setSaving(true);
    try {
      const body: Partial<Product> = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: Number(price),
        image_url: imageUrl.trim() || undefined,
        video_url: videoUrl.trim() || null,
        in_stock: inStock,
        category_id: selectedCategoryId,
      };
      if (isEdit && id) {
        await adminUpdateProduct(id, body);
      } else {
        await adminCreateProduct(body);
      }
      router.back();
    } catch (e) {
      console.error('[ProductEdit] Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const editTitle = t('admin.product_edit_title');
  const newTitle = t('admin.product_new_title');
  const categoryLabel = t('admin.product_category_label');
  const nameLabel = t('admin.product_name_label');
  const namePlaceholder = t('admin.product_name_placeholder');
  const descLabel = t('admin.product_desc_label');
  const descPlaceholder = t('admin.product_desc_placeholder');
  const priceLabel = t('admin.product_price_label');
  const imageLabel = t('admin.product_image_label');
  const videoUrlLabel = t('admin.product_video_url');
  const videoUrlPlaceholder = t('admin.product_video_url_placeholder');
  const inStockLabel = t('admin.product_in_stock_label');
  const saveLabel = t('common.save');
  const addLabel = t('common.add');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: isEdit ? editTitle : newTitle }} />
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Category picker */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8 }}>
            {categoryLabel}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            {categories.map((cat) => (
              <AnimatedPressable
                key={cat.id}
                onPress={() => {
                  console.log(`[ProductEdit] Category selected: ${cat.slug}`);
                  setSelectedCategoryId(cat.id);
                }}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 10,
                  backgroundColor: selectedCategoryId === cat.id ? COLORS.primary : COLORS.surfaceSecondary,
                  borderWidth: 1,
                  borderColor: selectedCategoryId === cat.id ? COLORS.primary : COLORS.border,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: selectedCategoryId === cat.id ? '#FFF' : COLORS.text,
                  }}
                >
                  {cat.name_ku}
                </Text>
              </AnimatedPressable>
            ))}
          </ScrollView>
          {errors.category ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.category}</Text>
          ) : null}
        </View>

        <FormField label={nameLabel} value={name} onChangeText={setName} placeholder={namePlaceholder} error={errors.name} />
        <FormField label={descLabel} value={description} onChangeText={setDescription} placeholder={descPlaceholder} multiline />
        <FormField label={priceLabel} value={price} onChangeText={setPrice} placeholder="0" keyboardType="numeric" error={errors.price} />
        <FormField label={imageLabel} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." />
        <FormField label={videoUrlLabel} value={videoUrl} onChangeText={(v) => {
          console.log('[ProductEdit] Video URL changed');
          setVideoUrl(v);
        }} placeholder={videoUrlPlaceholder} />

        {/* In stock switch */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: COLORS.surface,
            borderRadius: 12,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>{inStockLabel}</Text>
          <Switch
            value={inStock}
            onValueChange={(v) => {
              console.log(`[ProductEdit] In stock toggled: ${v}`);
              setInStock(v);
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFF"
          />
        </View>
      </ScrollView>

      {/* Save button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: insets.bottom + 90,
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <AnimatedPressable
          onPress={handleSave}
          disabled={saving}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              {isEdit ? saveLabel : addLabel}
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}
