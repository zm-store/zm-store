import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { COLORS } from '@/constants/Colors';
import { useCart } from '@/contexts/CartContext';
import { getCheckoutDefaults } from '@/utils/zmstore';
import { useAuth } from '@/contexts/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppSettings } from '@/hooks/useAppSettings';
import { openWhatsApp, STORE_WHATSAPP } from '@/utils/whatsapp';
import { useLanguage } from '@/lib/i18n';

const STORAGE_NAME_KEY = 'zmstore.checkout.name';
const STORAGE_PHONE_KEY = 'zmstore.checkout.phone';
const STORAGE_ADDRESS_KEY = 'zmstore.checkout.address';

function formatKurdishPrice(n: number): string {
  return Number(n).toLocaleString('en-US');
}

export default function CheckoutScreen() {
  const { items, total, clear } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { deliveryFee, serviceFee } = useAppSettings();
  const { t } = useLanguage();

  const grandTotal = total + deliveryFee + serviceFee;

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; phone?: string; address?: string }>({});
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    (async () => {
      // 1. Local prefill first (instant, works offline / before auth)
      try {
        const [localName, localPhone, localAddress] = await Promise.all([
          AsyncStorage.getItem(STORAGE_NAME_KEY),
          AsyncStorage.getItem(STORAGE_PHONE_KEY),
          AsyncStorage.getItem(STORAGE_ADDRESS_KEY),
        ]);
        console.log('[Checkout] Local prefill — name:', localName, 'phone:', localPhone, 'address:', localAddress);
        if (localName) setName(localName);
        if (localPhone) setPhone(localPhone);
        if (localAddress) setAddress(localAddress);
      } catch (err) {
        console.warn('[Checkout] Local prefill failed:', err);
      }

      // 2. Server prefill overrides local (canonical user-confirmed values)
      console.log('[Checkout] Fetching checkout defaults');
      try {
        const defaults = await getCheckoutDefaults();
        console.log('[Checkout] Defaults received:', defaults);
        if (defaults.phone) {
          setPhone(defaults.phone);
          setPrefilled(true);
        }
        if (defaults.address) {
          setAddress(defaults.address);
          setPrefilled(true);
        }
      } catch (err) {
        console.warn('[Checkout] Could not load defaults (ignored):', err);
      }
    })();
  }, []);

  // Debounced autosave — name
  useEffect(() => {
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_NAME_KEY, name).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [name]);

  // Debounced autosave — phone
  useEffect(() => {
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_PHONE_KEY, phone).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [phone]);

  // Debounced autosave — address
  useEffect(() => {
    const timer = setTimeout(() => {
      AsyncStorage.setItem(STORAGE_ADDRESS_KEY, address).catch(() => {});
    }, 300);
    return () => clearTimeout(timer);
  }, [address]);

  const validate = () => {
    const newErrors: { name?: string; phone?: string; address?: string } = {};
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    if (!trimmedName || trimmedName.length < 1 || trimmedName.length > 80) {
      newErrors.name = t('checkout.error_name');
    }
    const digitsOnly = trimmedPhone.replace(/\D/g, '');
    if (!trimmedPhone || digitsOnly.length < 6 || digitsOnly.length > 20) {
      newErrors.phone = t('checkout.error_phone');
    }
    if (trimmedAddress.length < 3) {
      newErrors.address = t('checkout.error_address');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    console.log('[Checkout] WhatsApp order pressed — name:', name, 'phone:', phone, 'address:', address, 'items:', items.length);

    if (items.length === 0) {
      Alert.alert(t('cart.empty_alert_title'), t('cart.empty_alert_msg'));
      return;
    }

    if (!validate()) {
      console.log('[Checkout] Validation failed');
      return;
    }

    setLoading(true);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedAddress = address.trim();

    // Build item lines
    const itemLines = items
      .map((item) => {
        const lineTotal = item.unit_price * item.quantity;
        const formattedLine = `• ${item.name} × ${item.quantity} = ${formatKurdishPrice(lineTotal)} د.ع`;
        return formattedLine;
      })
      .join('\n');

    const subtotalFormatted = formatKurdishPrice(total);
    const deliveryFormatted = formatKurdishPrice(deliveryFee);
    const serviceFormatted = formatKurdishPrice(serviceFee);
    const grandTotalFormatted = formatKurdishPrice(grandTotal);

    // NOTE: This WhatsApp message is a fixed brand message — not translated
    const message =
      `🛍️ داواکاریی نوێ — Zm Store\n\n` +
      `👤 ناو: ${trimmedName}\n` +
      `📞 ژمارە: ${trimmedPhone}\n` +
      `📍 ناونیشان: ${trimmedAddress}\n\n` +
      `📦 کاڵاکان:\n` +
      `${itemLines}\n\n` +
      `────────────\n` +
      `کۆی کاڵاکان: ${subtotalFormatted} د.ع\n` +
      `تێچووی گەیاندن: ${deliveryFormatted} د.ع\n` +
      `تێچووی خزمەتگوزاری: ${serviceFormatted} د.ع\n` +
      `────────────\n` +
      `💰 کۆی گشتی: ${grandTotalFormatted} د.ع\n\n` +
      `سوپاس بۆ هەڵبژاردنی ئێمە 🙏`;

    console.log('[Checkout] Built WhatsApp message, length:', message.length);

    // Persist final confirmed values before opening WhatsApp
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_NAME_KEY, trimmedName),
        AsyncStorage.setItem(STORAGE_PHONE_KEY, trimmedPhone),
        AsyncStorage.setItem(STORAGE_ADDRESS_KEY, trimmedAddress),
      ]);
      console.log('[Checkout] Persisted name/phone/address to AsyncStorage');
    } catch (err) {
      console.warn('[Checkout] AsyncStorage persist failed (ignored):', err);
    }

    try {
      console.log('[Checkout] Opening WhatsApp with STORE_WHATSAPP:', STORE_WHATSAPP);
      await openWhatsApp(STORE_WHATSAPP, message);
      console.log('[Checkout] WhatsApp opened successfully — clearing cart and navigating home');
      clear();
      router.replace('/(tabs)/(home)');
    } catch (e) {
      console.error('[Checkout] Failed to open WhatsApp:', e);
      Alert.alert(
        t('checkout.whatsapp_error_title'),
        t('checkout.whatsapp_error_msg')
      );
    } finally {
      setLoading(false);
    }
  };

  const orderSummaryLabel = t('checkout.order_summary');
  const prefilledNotice = t('checkout.prefilled_notice');
  const nameLabelText = t('checkout.name_label');
  const namePlaceholderText = t('checkout.name_placeholder');
  const phoneLabelText = t('checkout.phone_label');
  const addressLabelText = t('checkout.address_label');
  const addressPlaceholderText = t('checkout.address_placeholder');
  const notesLabelText = t('checkout.notes_label');
  const notesPlaceholderText = t('checkout.notes_placeholder');
  const whatsappHintText = t('checkout.whatsapp_hint');
  const confirmBtnText = t('checkout.confirm_btn');
  const subtotalLabel = t('cart.subtotal');
  const deliveryLabel = t('cart.delivery_fee');
  const serviceLabel = t('cart.service_fee');
  const grandTotalLabel = t('cart.grand_total');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Order summary */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
            {orderSummaryLabel}
          </Text>

          {/* Item rows */}
          {items.map((item) => {
            const lineTotal = item.unit_price * item.quantity;
            return (
              <View
                key={item.product_id}
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  paddingVertical: 6,
                  borderBottomWidth: 1,
                  borderBottomColor: COLORS.divider,
                }}
              >
                <Text style={{ fontSize: 14, color: COLORS.text, flex: 1 }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginHorizontal: 8 }}>
                  x{item.quantity}
                </Text>
                <PriceText value={lineTotal} size={13} />
              </View>
            );
          })}

          {/* Fee breakdown */}
          <View style={{ marginTop: 12, gap: 8 }}>
            {/* Subtotal */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <PriceText value={total} size={14} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{subtotalLabel}</Text>
            </View>

            {/* Delivery fee */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <PriceText value={deliveryFee} size={14} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{deliveryLabel}</Text>
            </View>

            {/* Service fee */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <PriceText value={serviceFee} size={14} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{serviceLabel}</Text>
            </View>

            {/* Divider */}
            <View style={{ height: 1, backgroundColor: COLORS.divider }} />

            {/* Grand total */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <PriceText value={grandTotal} size={16} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>{grandTotalLabel}</Text>
            </View>
          </View>
        </View>

        {/* Prefill notice */}
        {prefilled ? (
          <View
            style={{
              backgroundColor: 'rgba(63,143,92,0.08)',
              borderRadius: 10,
              padding: 10,
              borderWidth: 1,
              borderColor: 'rgba(63,143,92,0.2)',
            }}
          >
            <Text style={{ fontSize: 13, color: COLORS.success, textAlign: 'center' }}>
              {prefilledNotice}
            </Text>
          </View>
        ) : null}

        {/* Name */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {nameLabelText}
          </Text>
          <TextInput
            value={name}
            onChangeText={(v) => {
              console.log('[Checkout] Name changed');
              setName(v);
              if (errors.name) setErrors((e) => ({ ...e, name: undefined }));
            }}
            placeholder={namePlaceholderText}
            placeholderTextColor={COLORS.textTertiary}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: errors.name ? COLORS.danger : COLORS.border,
            }}
          />
          {errors.name ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.name}</Text>
          ) : null}
        </View>

        {/* Phone */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {phoneLabelText}
          </Text>
          <TextInput
            value={phone}
            onChangeText={(v) => {
              console.log('[Checkout] Phone changed');
              setPhone(v);
              if (errors.phone) setErrors((e) => ({ ...e, phone: undefined }));
            }}
            placeholder="07xxxxxxxxx"
            placeholderTextColor={COLORS.textTertiary}
            keyboardType="phone-pad"
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: errors.phone ? COLORS.danger : COLORS.border,
            }}
          />
          {errors.phone ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.phone}</Text>
          ) : null}
        </View>

        {/* Address */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {addressLabelText}
          </Text>
          <TextInput
            value={address}
            onChangeText={(v) => {
              console.log('[Checkout] Address changed');
              setAddress(v);
              if (errors.address) setErrors((e) => ({ ...e, address: undefined }));
            }}
            placeholder={addressPlaceholderText}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={3}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: errors.address ? COLORS.danger : COLORS.border,
              minHeight: 80,
              textAlignVertical: 'top',
            }}
          />
          {errors.address ? (
            <Text style={{ color: COLORS.danger, fontSize: 12, marginTop: 4 }}>{errors.address}</Text>
          ) : null}
        </View>

        {/* Notes */}
        <View>
          <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 6 }}>
            {notesLabelText}
          </Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder={notesPlaceholderText}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={2}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              padding: 14,
              fontSize: 15,
              color: COLORS.text,
              borderWidth: 1,
              borderColor: COLORS.border,
              minHeight: 60,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </ScrollView>

      {/* Submit button */}
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
        <Text
          style={{
            fontSize: 12,
            color: COLORS.textSecondary,
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          {whatsappHintText}
        </Text>
        <AnimatedPressable
          onPress={handleSubmit}
          disabled={loading}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              {confirmBtnText}
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}
