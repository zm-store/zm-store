import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ImageIcon } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import {
  adminListCategories,
  adminCreateCategory,
  adminUpdateCategory,
  adminDeleteCategory,
  Category,
} from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

interface FormErrors {
  name_ku?: string;
  name_en?: string;
  slug?: string;
}

export default function CategoryEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const isEditMode = !!id;

  const [nameKu, setNameKu] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [slug, setSlug] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [imageUrl, setImageUrl] = useState('');
  const [localPreviewUri, setLocalPreviewUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(isEditMode);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [imagePickerWarning, setImagePickerWarning] = useState(false);

  useEffect(() => {
    if (!isEditMode) return;
    console.log(`[CategoryEdit] Loading category: ${id}`);
    adminListCategories()
      .then((list) => {
        const cat = list.find((c) => c.id === id);
        if (cat) {
          setNameKu(cat.name_ku);
          setNameEn(cat.name_en);
          setSlug(cat.slug);
          setSortOrder(String(cat.sort_order));
          setImageUrl(cat.image_url ?? '');
        }
      })
      .catch((e) => console.error('[CategoryEdit] Load error:', e))
      .finally(() => setLoading(false));
  }, [id, isEditMode]);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!nameKu.trim()) newErrors.name_ku = t('admin.category_error_name_ku');
    if (!nameEn.trim()) newErrors.name_en = t('admin.category_error_name_en');
    if (!slug.trim()) newErrors.slug = t('admin.category_error_slug');
    else if (!/^[a-z0-9_]+$/.test(slug.trim())) newErrors.slug = t('admin.category_error_slug_format');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    console.log('[CategoryEdit] Pick image pressed');
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      // Store only as local preview — do NOT write to imageUrl (the DB field)
      setLocalPreviewUri(uri);
      setImagePickerWarning(true);
      console.log('[CategoryEdit] Image picked for preview only (local URI):', uri);
    }
  };

  const handleSave = async () => {
    console.log('[CategoryEdit] Save pressed');
    if (!validate()) return;

    setSaving(true);
    setSubmitError(null);

    const body: Partial<Category> = {
      name_ku: nameKu.trim(),
      name_en: nameEn.trim(),
      slug: slug.trim(),
      sort_order: Number(sortOrder) || 0,
      image_url: imageUrl.trim() || undefined,
    };

    try {
      if (isEditMode && id) {
        await adminUpdateCategory(id, body);
        console.log('[CategoryEdit] Category updated:', id);
      } else {
        const created = await adminCreateCategory(body);
        console.log('[CategoryEdit] Category created:', created.id);
      }
      router.back();
    } catch (e: any) {
      console.error('[CategoryEdit] Save error:', e);
      setSubmitError(t('admin.category_save_error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id) return;
    console.log('[CategoryEdit] Delete confirmed for:', id);
    setShowDeleteModal(false);
    setDeleting(true);
    try {
      await adminDeleteCategory(id);
      console.log('[CategoryEdit] Category deleted:', id);
      router.back();
    } catch (e: any) {
      console.error('[CategoryEdit] Delete error:', e);
      setSubmitError(t('admin.category_delete_error'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const previewSource = localPreviewUri ?? (imageUrl.length > 0 ? imageUrl : null);
  const hasImagePreview = previewSource !== null;
  const pickImageLabel = t('admin.category_pick_image');
  const imageWarningText = t('admin.category_image_warning');
  const imageUrlLabel = t('admin.category_image_label');
  const nameKuLabel = t('admin.category_name_ku_label');
  const nameKuPlaceholder = t('admin.category_name_ku_placeholder');
  const nameEnLabel = t('admin.category_name_en_label');
  const sortLabel = t('admin.category_sort_label');
  const saveLabel = t('common.save');
  const deleteLabel = t('common.delete');
  const cancelLabel = t('common.cancel');
  const deleteConfirmTitle = t('admin.category_delete_confirm_title');
  const deleteConfirmMsg = t('admin.category_delete_confirm_msg');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Image preview + picker */}
        <View style={{ alignItems: 'center', gap: 12 }}>
          {hasImagePreview ? (
            <Image
              source={resolveImageSource(previewSource ?? undefined)}
              style={{
                width: 120,
                height: 120,
                borderRadius: 20,
                backgroundColor: COLORS.surfaceSecondary,
              }}
              resizeMode="cover"
            />
          ) : (
            <View
              style={{
                width: 120,
                height: 120,
                borderRadius: 20,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: COLORS.border,
                borderStyle: 'dashed',
              }}
            >
              <ImageIcon size={32} color={COLORS.textTertiary} />
            </View>
          )}
          <AnimatedPressable
            onPress={handlePickImage}
            style={{
              backgroundColor: COLORS.primaryMuted,
              borderRadius: 10,
              paddingHorizontal: 16,
              paddingVertical: 8,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.primary }}>
              {pickImageLabel}
            </Text>
          </AnimatedPressable>
          {imagePickerWarning ? (
            <Text style={{ fontSize: 12, color: COLORS.warning, textAlign: 'center', paddingHorizontal: 16 }}>
              وێنەکە تەنها بۆ پێشبینین دەرکەوتووە. تکایە لینکی وێنەکە لە خانەی URL دا بنووسە بۆ پاشەکەوتکردن.
            </Text>
          ) : null}
        </View>

        {/* image_url field */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {imageUrlLabel}
          </Text>
          <TextInput
            value={imageUrl}
            onChangeText={(text) => {
              setImageUrl(text);
              setImagePickerWarning(false);
              if (text.trim().length > 0) setLocalPreviewUri(null);
            }}
            placeholder="https://example.com/image.jpg"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            keyboardType="url"
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 14,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          />
        </View>

        {/* name_ku */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {nameKuLabel}
          </Text>
          <TextInput
            value={nameKu}
            onChangeText={(text) => {
              setNameKu(text);
              if (errors.name_ku) setErrors((e) => ({ ...e, name_ku: undefined }));
            }}
            placeholder={nameKuPlaceholder}
            placeholderTextColor={COLORS.textTertiary}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: errors.name_ku ? COLORS.danger : COLORS.border,
            }}
          />
          {errors.name_ku ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.name_ku}</Text>
          ) : null}
        </View>

        {/* name_en */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {nameEnLabel}
          </Text>
          <TextInput
            value={nameEn}
            onChangeText={(text) => {
              setNameEn(text);
              if (errors.name_en) setErrors((e) => ({ ...e, name_en: undefined }));
            }}
            placeholder="English name..."
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="words"
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: errors.name_en ? COLORS.danger : COLORS.border,
            }}
          />
          {errors.name_en ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.name_en}</Text>
          ) : null}
        </View>

        {/* slug */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            Slug *
          </Text>
          <TextInput
            value={slug}
            onChangeText={(text) => {
              setSlug(text.toLowerCase().replace(/[^a-z0-9_]/g, ''));
              if (errors.slug) setErrors((e) => ({ ...e, slug: undefined }));
            }}
            placeholder="category_slug"
            placeholderTextColor={COLORS.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: errors.slug ? COLORS.danger : COLORS.border,
              fontFamily: 'monospace',
            }}
          />
          {errors.slug ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.slug}</Text>
          ) : null}
        </View>

        {/* sort_order */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {sortLabel}
          </Text>
          <TextInput
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder="0"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="number-pad"
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          />
        </View>

        {submitError ? (
          <View
            style={{
              backgroundColor: 'rgba(220,38,38,0.08)',
              borderRadius: 12,
              padding: 12,
            }}
          >
            <Text style={{ color: COLORS.danger, textAlign: 'center', fontSize: 14 }}>
              {submitError}
            </Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom actions */}
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
          gap: 10,
        }}
      >
        <AnimatedPressable
          onPress={handleSave}
          disabled={saving || deleting}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 52,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>{saveLabel}</Text>
          )}
        </AnimatedPressable>

        {isEditMode ? (
          <AnimatedPressable
            onPress={() => {
              console.log('[CategoryEdit] Delete button pressed');
              setShowDeleteModal(true);
            }}
            disabled={saving || deleting}
            style={{
              backgroundColor: 'rgba(220,38,38,0.08)',
              borderRadius: 14,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(220,38,38,0.2)',
            }}
          >
            {deleting ? (
              <ActivityIndicator color={COLORS.danger} />
            ) : (
              <Text style={{ color: COLORS.danger, fontSize: 15, fontWeight: '700' }}>{deleteLabel}</Text>
            )}
          </AnimatedPressable>
        ) : null}
      </View>

      {/* Delete confirmation modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
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
              maxWidth: 360,
              gap: 16,
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' }}>
              {deleteConfirmTitle}
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center' }}>
              {deleteConfirmMsg}
            </Text>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity
                onPress={() => {
                  console.log('[CategoryEdit] Delete cancelled');
                  setShowDeleteModal(false);
                }}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  height: 46,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>{cancelLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleDeleteConfirm}
                style={{
                  flex: 1,
                  backgroundColor: COLORS.danger,
                  borderRadius: 12,
                  height: 46,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 15, fontWeight: '700', color: '#FFF' }}>{deleteLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
