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
import { adminListBanners, adminCreateBanner, adminUpdateBanner, Banner } from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'numeric';
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
  );
}

export default function BannerEditScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const isEdit = !!id;

  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isEdit || !id) return;
    console.log(`[BannerEdit] Loading banner: ${id}`);
    adminListBanners()
      .then((banners) => {
        const banner = banners.find((b) => b.id === id);
        if (banner) {
          setImageUrl(banner.image_url ?? '');
          setTitle(banner.title ?? '');
          setLinkUrl(banner.link_url ?? '');
          setSortOrder(String(banner.sort_order));
          setActive(banner.active);
        }
      })
      .catch((e) => console.error('[BannerEdit] Load error:', e))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const handleSave = async () => {
    console.log(`[BannerEdit] Save pressed, isEdit=${isEdit}`);
    setSaving(true);
    try {
      const body: Partial<Banner> = {
        image_url: imageUrl.trim(),
        title: title.trim() || undefined,
        link_url: linkUrl.trim() || undefined,
        sort_order: Number(sortOrder) || 0,
        active,
      };
      if (isEdit && id) {
        await adminUpdateBanner(id, body);
      } else {
        await adminCreateBanner(body);
      }
      router.back();
    } catch (e) {
      console.error('[BannerEdit] Save error:', e);
    } finally {
      setSaving(false);
    }
  };

  const editTitle = t('admin.banner_edit_title');
  const newTitle = t('admin.banner_new_title');
  const imageLabelText = t('admin.banner_image_label');
  const titleLabelText = t('admin.banner_title_label');
  const titlePlaceholderText = t('admin.banner_title_placeholder');
  const linkLabelText = t('admin.banner_link_label');
  const linkPlaceholderText = t('admin.banner_link_placeholder');
  const sortLabelText = t('admin.banner_sort_label');
  const activeLabelText = t('admin.banner_active_label');
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
        <FormField label={imageLabelText} value={imageUrl} onChangeText={setImageUrl} placeholder="https://..." />
        <FormField label={titleLabelText} value={title} onChangeText={setTitle} placeholder={titlePlaceholderText} />
        <FormField label={linkLabelText} value={linkUrl} onChangeText={setLinkUrl} placeholder={linkPlaceholderText} />
        <FormField label={sortLabelText} value={sortOrder} onChangeText={setSortOrder} keyboardType="numeric" />

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
          <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text }}>{activeLabelText}</Text>
          <Switch
            value={active}
            onValueChange={(v) => {
              console.log(`[BannerEdit] Active toggled: ${v}`);
              setActive(v);
            }}
            trackColor={{ false: COLORS.border, true: COLORS.primary }}
            thumbColor="#FFF"
          />
        </View>
      </ScrollView>

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
