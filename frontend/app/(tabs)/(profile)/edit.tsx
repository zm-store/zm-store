import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Alert,
  Image,
  ImageSourcePropType,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { Camera } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LoadingButton } from '@/components/LoadingButton';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { updateMe } from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

const errMsg = (e: unknown): string => {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e.length > 200 ? e.slice(0, 200) + '…' : e;
  if (e && typeof e === 'object') {
    try { return JSON.stringify(e).slice(0, 200); } catch { return String(e).slice(0, 200); }
  }
  return String(e);
};

export default function EditProfileScreen() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [name, setName] = useState(user?.name ?? '');
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(user?.image ?? null);
  const [saving, setSaving] = useState(false);

  const initials = (() => {
    const n = user?.name ?? user?.email ?? 'U';
    return n
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  })();

  const hasImage = !!imageDataUrl;

  const handlePickImage = async () => {
    console.log('[EditProfile] Pick image pressed');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        console.log('[EditProfile] Image picked, uri:', asset.uri);
        const manipulated = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 512 } }],
          { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );
        if (!manipulated.base64) {
          throw new Error('Image manipulation produced no base64 output');
        }
        if (manipulated.base64.length > 500_000) {
          Alert.alert(t('profile.error_image_too_large'), t('profile.error_image_too_large_msg'));
          return;
        }
        const dataUrl = `data:image/jpeg;base64,${manipulated.base64}`;
        setImageDataUrl(dataUrl);
        console.log('[EditProfile] Image selected, compressed size:', manipulated.base64.length);
      }
    } catch (e: unknown) {
      console.error('[EditProfile] Image picker error:', errMsg(e));
      Alert.alert(t('profile.error_title'), t('profile.error_image_pick'));
    }
  };

  const handleRemoveImage = async () => {
    console.log('[EditProfile] Remove image pressed');
    setSaving(true);
    try {
      await updateMe({ image: '' });
      setImageDataUrl(null);
      await refresh();
      console.log('[EditProfile] Image removed successfully');
    } catch (e: unknown) {
      console.error('[EditProfile] Remove image error:', errMsg(e));
      Alert.alert(t('profile.error_title'), e instanceof Error ? e.message : t('profile.error_generic'));
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    console.log('[EditProfile] Save pressed, name:', name.trim());
    const trimmedName = name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 80) {
      Alert.alert(t('profile.error_title'), t('profile.error_name_length'));
      return;
    }

    setSaving(true);
    try {
      const body: { name: string; image?: string } = { name: trimmedName };
      if (imageDataUrl !== (user?.image ?? null)) {
        body.image = imageDataUrl ?? '';
      }
      await updateMe(body);
      console.log('[EditProfile] Profile saved successfully');
      await refresh();
      router.back();
    } catch (e: unknown) {
      console.error('[EditProfile] Save error:', errMsg(e));
      const msg = errMsg(e);
      if (msg.includes('413')) {
        Alert.alert(t('profile.error_image_too_large'), t('profile.error_image_too_large_msg'));
      } else {
        Alert.alert(t('profile.error_title'), e instanceof Error ? e.message : t('profile.error_generic'));
      }
    } finally {
      setSaving(false);
    }
  };

  const changePhotoLabel = t('profile.change_photo');
  const nameLabelText = t('profile.name_label');
  const namePlaceholderText = t('profile.name_placeholder');
  const saveLabel = t('profile.save');
  const removePhotoLabel = t('profile.remove_photo');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 24, paddingBottom: insets.bottom + 40, gap: 24 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar */}
        <View style={{ alignItems: 'center', gap: 10 }}>
          <AnimatedPressable onPress={handlePickImage} style={{ position: 'relative' }}>
            <View
              style={{
                width: 160,
                height: 160,
                borderRadius: 80,
                backgroundColor: COLORS.primaryMuted,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 3,
                borderColor: COLORS.accent,
                overflow: 'hidden',
              }}
            >
              {hasImage ? (
                <Image
                  source={resolveImageSource(imageDataUrl)}
                  style={{ width: 160, height: 160, borderRadius: 80 }}
                  resizeMode="cover"
                />
              ) : (
                <Text style={{ fontSize: 52, fontWeight: '700', color: COLORS.primary }}>
                  {initials}
                </Text>
              )}
            </View>
            {/* Camera overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: 4,
                right: 4,
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: COLORS.primary,
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: COLORS.background,
              }}
            >
              <Camera size={18} color="#FFF" />
            </View>
          </AnimatedPressable>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{changePhotoLabel}</Text>
        </View>

        {/* Name field */}
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }}>{nameLabelText}</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder={namePlaceholderText}
            placeholderTextColor={COLORS.textTertiary}
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

        {/* Save button */}
        <LoadingButton
          title={saveLabel}
          loading={saving}
          onPress={handleSave}
          style={{ backgroundColor: COLORS.primary, borderRadius: 14, height: 54 }}
        />

        {/* Remove image button */}
        {hasImage ? (
          <AnimatedPressable
            onPress={handleRemoveImage}
            disabled={saving}
            style={{
              borderRadius: 12,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: COLORS.danger,
            }}
          >
            <Text style={{ color: COLORS.danger, fontWeight: '600', fontSize: 15 }}>
              {removePhotoLabel}
            </Text>
          </AnimatedPressable>
        ) : null}
      </ScrollView>
    </View>
  );
}
