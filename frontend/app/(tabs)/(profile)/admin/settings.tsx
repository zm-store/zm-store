import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { adminGetSettings, adminUpdateSettings } from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

export default function AdminSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deliveryFeeText, setDeliveryFeeText] = useState('');
  const [serviceFeeText, setServiceFeeText] = useState('');
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const [serviceError, setServiceError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[AdminSettings] Loading settings');
    adminGetSettings()
      .then((s) => {
        console.log('[AdminSettings] Settings loaded:', s);
        setDeliveryFeeText(String(s.delivery_fee));
        setServiceFeeText(String(s.service_fee));
      })
      .catch((e) => {
        console.error('[AdminSettings] Load error:', e);
        Alert.alert(t('common.error'), t('admin.settings_load_error'));
      })
      .finally(() => setLoadingData(false));
  }, [t]);

  const validate = (): boolean => {
    let valid = true;
    const errorMsg = t('admin.settings_error_fee');

    const df = Number(deliveryFeeText.trim());
    if (!deliveryFeeText.trim() || isNaN(df) || df < 0 || !Number.isInteger(df)) {
      setDeliveryError(errorMsg);
      valid = false;
    } else {
      setDeliveryError(null);
    }

    const sf = Number(serviceFeeText.trim());
    if (!serviceFeeText.trim() || isNaN(sf) || sf < 0 || !Number.isInteger(sf)) {
      setServiceError(errorMsg);
      valid = false;
    } else {
      setServiceError(null);
    }

    return valid;
  };

  const handleSave = async () => {
    console.log('[AdminSettings] Save pressed');
    if (!validate()) return;

    setSaving(true);
    try {
      await adminUpdateSettings({
        delivery_fee: Number(deliveryFeeText.trim()),
        service_fee: Number(serviceFeeText.trim()),
      });
      console.log('[AdminSettings] Settings saved successfully');
      Alert.alert(t('admin.settings_save_success_title'), t('admin.settings_save_success_msg'), [
        { text: t('admin.settings_ok'), onPress: () => router.back() },
      ]);
    } catch (e: any) {
      console.error('[AdminSettings] Save error:', e);
      Alert.alert(t('admin.settings_save_error_title'), e?.message ?? t('admin.settings_save_error_msg'));
    } finally {
      setSaving(false);
    }
  };

  const deliveryFeeLabel = t('admin.settings_delivery_fee');
  const serviceFeeLabel = t('admin.settings_service_fee');
  const saveBtnLabel = t('admin.settings_save_btn');

  if (loadingData) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Delivery fee */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, textAlign: 'right' }}>
            {deliveryFeeLabel}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: deliveryError ? COLORS.danger : COLORS.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 14,
                backgroundColor: COLORS.surface,
                borderLeftWidth: 1,
                borderLeftColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' }}>د.ع</Text>
            </View>
            <TextInput
              value={deliveryFeeText}
              onChangeText={(text) => {
                console.log('[AdminSettings] Delivery fee changed');
                setDeliveryFeeText(text);
                if (deliveryError) setDeliveryError(null);
              }}
              placeholder="3000"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
              style={{
                flex: 1,
                padding: 14,
                fontSize: 16,
                color: COLORS.text,
                textAlign: 'right',
              }}
            />
          </View>
          {deliveryError ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4, textAlign: 'right' }}>
              {deliveryError}
            </Text>
          ) : null}
        </View>

        {/* Service fee */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, textAlign: 'right' }}>
            {serviceFeeLabel}
          </Text>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: serviceError ? COLORS.danger : COLORS.border,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                paddingHorizontal: 14,
                paddingVertical: 14,
                backgroundColor: COLORS.surface,
                borderLeftWidth: 1,
                borderLeftColor: COLORS.border,
              }}
            >
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontWeight: '600' }}>د.ع</Text>
            </View>
            <TextInput
              value={serviceFeeText}
              onChangeText={(text) => {
                console.log('[AdminSettings] Service fee changed');
                setServiceFeeText(text);
                if (serviceError) setServiceError(null);
              }}
              placeholder="250"
              placeholderTextColor={COLORS.textTertiary}
              keyboardType="number-pad"
              style={{
                flex: 1,
                padding: 14,
                fontSize: 16,
                color: COLORS.text,
                textAlign: 'right',
              }}
            />
          </View>
          {serviceError ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4, textAlign: 'right' }}>
              {serviceError}
            </Text>
          ) : null}
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
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              {saveBtnLabel}
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}
