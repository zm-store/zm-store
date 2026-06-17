import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Phone } from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { COLORS } from '@/constants/Colors';
import { adminGetOrder, adminUpdateOrderStatus, Order, OrderStatus } from '@/utils/zmstore';
import { openWhatsApp } from '@/utils/whatsapp';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/80x80/F4F6FB/0F1E47?text=Zm' };
  return { uri: source };
}

function WhatsAppIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </Svg>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    console.log(`[AdminOrderDetail] Loading order: ${id}`);
    try {
      const data = await adminGetOrder(id);
      setOrder(data);
      setError(null);
    } catch (e) {
      console.error('[AdminOrderDetail] Load error:', e);
      setError(t('admin.order_not_found'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleUpdateStatus = async (status: OrderStatus) => {
    if (!order) return;
    console.log(`[AdminOrderDetail] Update status: ${status}`);
    setUpdating(status);
    try {
      const updated = await adminUpdateOrderStatus(order.id, status);
      setOrder(updated);

      const msgMap: Record<string, string> = {
        accepted: t('admin.order_accepted_msg'),
        rejected: t('admin.order_rejected_msg'),
        completed: t('admin.order_completed_msg'),
      };
      const msg = msgMap[status] ?? t('admin.order_status_updated');
      Alert.alert(t('admin.order_success_title'), msg);

      // Auto-send WhatsApp message on Accept only
      // NOTE: The WhatsApp message content is a fixed brand message — not translated
      if (status === 'accepted' && updated.customer_phone) {
        console.log(`[AdminOrderDetail] Sending WhatsApp accept message to: ${updated.customer_phone}`);
        try {
          await openWhatsApp(
            updated.customer_phone,
            'سڵاو، داواکارییەکەت لە Zm Store قبول کراوە و ئێستا لە ڕێگایە بۆ لای تۆ.'
          );
        } catch (waErr) {
          console.warn('[AdminOrderDetail] WhatsApp launch failed:', waErr);
          Alert.alert(t('admin.order_whatsapp_note'), t('admin.order_whatsapp_fail'));
        }
      }
    } catch (e: any) {
      console.error('[AdminOrderDetail] Update status error:', e);
      Alert.alert(t('admin.order_error_title'), e?.message ?? t('admin.order_error_msg'));
    } finally {
      setUpdating(null);
    }
  };

  const handleCallPhone = () => {
    if (!order?.customer_phone) return;
    console.log(`[AdminOrderDetail] Call phone: ${order.customer_phone}`);
    Linking.openURL(`tel:${order.customer_phone}`);
  };

  const handleWhatsApp = () => {
    if (!order?.customer_phone) return;
    const phone = order.customer_phone.replace(/^0/, '964');
    // NOTE: This WhatsApp message is a fixed brand message — not translated
    const message = `سڵاو ${order.customer_name}، داواکارییەکەت #${order.id.slice(0, 8).toUpperCase()} وەرگیرا.`;
    console.log(`[AdminOrderDetail] WhatsApp to: ${phone}`);
    openWhatsApp(phone, message);
  };

  const detailTitle = t('admin.order_detail_title');
  const errorScreenTitle = t('admin.order_error_screen_title');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ title: detailTitle }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !order) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Stack.Screen options={{ title: errorScreenTitle }} />
        <Text style={{ color: COLORS.danger, fontSize: 16, textAlign: 'center' }}>
          {error ?? t('admin.order_not_found')}
        </Text>
      </View>
    );
  }

  const STATUS_CONFIG: Record<OrderStatus, { color: string; bg: string }> = {
    pending: { color: COLORS.warning, bg: 'rgba(217,145,58,0.12)' },
    accepted: { color: COLORS.success, bg: 'rgba(22,163,74,0.12)' },
    preparing: { color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
    picked_up: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
    delivered: { color: COLORS.success, bg: 'rgba(22,163,74,0.12)' },
    rejected: { color: COLORS.danger, bg: 'rgba(220,38,38,0.12)' },
    completed: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
    cancelled: { color: COLORS.textSecondary, bg: 'rgba(74,88,120,0.12)' },
  };

  const status = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.pending;
  const statusLabel = t(`status.${order.status}`);
  const shortId = order.id.slice(0, 8).toUpperCase();

  const hasFeesBreakdown = order.subtotal > 0;
  const displaySubtotal = hasFeesBreakdown ? order.subtotal : order.total;
  const displayDelivery = hasFeesBreakdown ? order.delivery_fee : 0;
  const displayService = hasFeesBreakdown ? order.service_fee : 0;

  const customerInfoLabel = t('admin.order_customer_info');
  const itemsLabel = t('admin.order_items');
  const nameLabel = t('common.name');
  const phoneLabel = t('common.phone');
  const addressLabel = t('common.address');
  const notesLabel = t('common.notes');
  const subtotalLabel = t('common.subtotal');
  const deliveryLabel = t('common.delivery_fee');
  const serviceLabel = t('common.service_fee');
  const grandTotalLabel = t('common.grand_total');
  const acceptBtnLabel = t('admin.order_accept_btn');
  const rejectBtnLabel = t('admin.order_reject_btn');
  const completedLabel = t('admin.order_completed_label');
  const rejectedLabel = t('admin.order_rejected_label');
  const markPreparingLabel = t('admin.mark_preparing');
  const markPickedUpLabel = t('admin.mark_picked_up');
  const markDeliveredLabel = t('admin.mark_delivered');
  const cancelOrderLabel = t('admin.cancel_order');
  const deliveredStatusLabel = t('status.delivered');
  const cancelledStatusLabel = t('status.cancelled');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <Stack.Screen options={{ title: `${t('common.order_number_prefix')}${shortId}` }} />

      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 180 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 20,
            padding: 20,
            borderWidth: 1,
            borderColor: COLORS.border,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 8 }}>
            #{shortId}
          </Text>
          <View style={{ backgroundColor: status.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 8 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: status.color }}>{statusLabel}</Text>
          </View>
          <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{formatDate(order.created_at)}</Text>
        </View>

        {/* Customer info + contact */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
            gap: 10,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
            {customerInfoLabel}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{nameLabel}</Text>
            <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '500' }}>{order.customer_name}</Text>
          </View>
          {order.customer_phone ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{phoneLabel}</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '500' }} selectable>
                  {order.customer_phone}
                </Text>
                <AnimatedPressable
                  onPress={handleCallPhone}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Phone size={16} color={COLORS.primary} />
                </AnimatedPressable>
                <AnimatedPressable
                  onPress={handleWhatsApp}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    backgroundColor: '#25D366',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <WhatsAppIcon size={16} />
                </AnimatedPressable>
              </View>
            </View>
          ) : null}
          {order.delivery_address ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{addressLabel}</Text>
              <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 16 }}>
                {order.delivery_address}
              </Text>
            </View>
          ) : null}
          {order.notes ? (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{notesLabel}</Text>
              <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '500', flex: 1, textAlign: 'right', marginLeft: 16 }}>
                {order.notes}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Items */}
        <View
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: COLORS.border,
          }}
        >
          <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 }}>
            {itemsLabel}
          </Text>
          {order.items.map((item, i) => (
            <View
              key={item.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: i < order.items.length - 1 ? 1 : 0,
                borderBottomColor: COLORS.divider,
              }}
            >
              <Image
                source={resolveImageSource(item.product_image_url)}
                style={{ width: 52, height: 52, borderRadius: 10 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }} numberOfLines={2}>
                  {item.product_name}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>x{item.quantity}</Text>
              </View>
              <PriceText value={item.unit_price * item.quantity} size={14} />
            </View>
          ))}

          <View style={{ borderTopWidth: 1, borderTopColor: COLORS.border, borderStyle: 'dashed', marginVertical: 12 }} />

          {/* Fee breakdown */}
          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <PriceText value={displaySubtotal} size={14} color={COLORS.textSecondary} />
              <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{subtotalLabel}</Text>
            </View>

            {hasFeesBreakdown ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <PriceText value={displayDelivery} size={14} color={COLORS.textSecondary} />
                <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{deliveryLabel}</Text>
              </View>
            ) : null}

            {hasFeesBreakdown ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <PriceText value={displayService} size={14} color={COLORS.textSecondary} />
                <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{serviceLabel}</Text>
              </View>
            ) : null}

            {hasFeesBreakdown ? (
              <View style={{ height: 1, backgroundColor: COLORS.divider }} />
            ) : null}

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <PriceText value={order.total} size={18} />
              <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text }}>{grandTotalLabel}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Action buttons */}
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
        {/* pending → accept + reject */}
        {order.status === 'pending' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable
              onPress={() => handleUpdateStatus('accepted')}
              disabled={!!updating}
              style={{
                flex: 1,
                backgroundColor: COLORS.success,
                borderRadius: 12,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {updating === 'accepted' ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{acceptBtnLabel}</Text>
              )}
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => handleUpdateStatus('rejected')}
              disabled={!!updating}
              style={{
                flex: 1,
                backgroundColor: COLORS.danger,
                borderRadius: 12,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {updating === 'rejected' ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{rejectBtnLabel}</Text>
              )}
            </AnimatedPressable>
          </View>
        )}

        {/* accepted → mark preparing + cancel */}
        {order.status === 'accepted' && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <AnimatedPressable
              onPress={() => handleUpdateStatus('preparing')}
              disabled={!!updating}
              style={{
                flex: 1,
                backgroundColor: '#1E3A8A',
                borderRadius: 12,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {updating === 'preparing' ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>{markPreparingLabel}</Text>
              )}
            </AnimatedPressable>
            <AnimatedPressable
              onPress={() => handleUpdateStatus('cancelled')}
              disabled={!!updating}
              style={{
                flex: 1,
                backgroundColor: COLORS.danger,
                borderRadius: 12,
                height: 48,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.85,
              }}
            >
              {updating === 'cancelled' ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{cancelOrderLabel}</Text>
              )}
            </AnimatedPressable>
          </View>
        )}

        {/* preparing → mark picked up */}
        {order.status === 'preparing' && (
          <AnimatedPressable
            onPress={() => handleUpdateStatus('picked_up')}
            disabled={!!updating}
            style={{
              backgroundColor: '#1E3A8A',
              borderRadius: 12,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {updating === 'picked_up' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>{markPickedUpLabel}</Text>
            )}
          </AnimatedPressable>
        )}

        {/* picked_up → mark delivered */}
        {order.status === 'picked_up' && (
          <AnimatedPressable
            onPress={() => handleUpdateStatus('delivered')}
            disabled={!!updating}
            style={{
              backgroundColor: COLORS.success,
              borderRadius: 12,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {updating === 'delivered' ? (
              <ActivityIndicator color="#FFF" size="small" />
            ) : (
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 15 }}>{markDeliveredLabel}</Text>
            )}
          </AnimatedPressable>
        )}

        {/* terminal states */}
        {(order.status === 'delivered' || order.status === 'completed') && (
          <View
            style={{
              backgroundColor: 'rgba(22,163,74,0.1)',
              borderRadius: 12,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(22,163,74,0.25)',
            }}
          >
            <Text style={{ color: COLORS.success, fontWeight: '700', fontSize: 14 }}>
              {deliveredStatusLabel}
            </Text>
          </View>
        )}
        {order.status === 'rejected' && (
          <View
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 }}>
              {rejectedLabel}
            </Text>
          </View>
        )}
        {order.status === 'cancelled' && (
          <View
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              height: 48,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: COLORS.textSecondary, fontWeight: '600', fontSize: 14 }}>
              {cancelledStatusLabel}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
