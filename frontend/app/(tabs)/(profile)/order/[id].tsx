import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack, useFocusEffect } from 'expo-router';
import { PriceText } from '@/components/PriceText';
import { COLORS } from '@/constants/Colors';
import { getMyOrder, Order, OrderStatus, OrderStatusHistoryEntry } from '@/utils/zmstore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/80x80/F4F6FB/0F1E47?text=Zm' };
  return { uri: source };
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

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const TERMINAL_STATUSES: OrderStatus[] = ['delivered', 'completed', 'rejected', 'cancelled'];

const PIPELINE_STAGES: { status: OrderStatus; labelKey: string }[] = [
  { status: 'pending', labelKey: 'status.pending' },
  { status: 'accepted', labelKey: 'status.accepted' },
  { status: 'preparing', labelKey: 'status.preparing' },
  { status: 'picked_up', labelKey: 'status.picked_up' },
  { status: 'delivered', labelKey: 'status.delivered' },
];

interface TimelineStageProps {
  label: string;
  isCompleted: boolean;
  isActive: boolean;
  timestamp?: string;
  isLast: boolean;
  prevCompleted: boolean;
}

function TimelineStage({ label, isCompleted, isActive, timestamp, isLast, prevCompleted }: TimelineStageProps) {
  const circleSize = isActive ? 20 : 16;
  const circleColor = isCompleted
    ? COLORS.success
    : isActive
    ? COLORS.primary
    : COLORS.border;
  const circleBg = isCompleted || isActive ? circleColor : 'transparent';
  const lineColor = prevCompleted && isCompleted ? COLORS.success : COLORS.border;
  const lineDashed = !(prevCompleted && isCompleted);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', minHeight: isLast ? 0 : 56 }}>
      {/* Left column: circle + line */}
      <View style={{ width: 32, alignItems: 'center' }}>
        <View
          style={{
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            backgroundColor: circleBg,
            borderWidth: isCompleted || isActive ? 0 : 2,
            borderColor: circleColor,
            marginTop: 2,
          }}
        />
        {!isLast ? (
          <View
            style={{
              width: 2,
              flex: 1,
              marginTop: 4,
              backgroundColor: lineDashed ? 'transparent' : lineColor,
              borderLeftWidth: lineDashed ? 2 : 0,
              borderLeftColor: lineColor,
              borderStyle: lineDashed ? 'dashed' : 'solid',
              minHeight: 32,
            }}
          />
        ) : null}
      </View>

      {/* Right column: label + timestamp */}
      <View style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 16 }}>
        <Text
          style={{
            fontSize: isActive ? 15 : 14,
            fontWeight: isActive || isCompleted ? '700' : '500',
            color: isCompleted || isActive ? COLORS.text : COLORS.textTertiary,
          }}
        >
          {label}
        </Text>
        {timestamp ? (
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
            {timestamp}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadOrder = useCallback(async () => {
    if (!id) return;
    console.log(`[OrderDetail] Loading order: ${id}`);
    try {
      const data = await getMyOrder(id);
      setOrder(data);
      setError(null);
      return data;
    } catch (e) {
      console.error('[OrderDetail] Load error:', e);
      setError(t('profile.order_not_found'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Start polling when focused
      if (!id) return;
      intervalRef.current = setInterval(async () => {
        console.log(`[OrderDetail] Polling order: ${id}`);
        const data = await loadOrder();
        if (data && TERMINAL_STATUSES.includes(data.status)) {
          console.log(`[OrderDetail] Terminal status reached (${data.status}), stopping poll`);
          stopPolling();
        }
      }, 10000);

      return () => {
        stopPolling();
      };
    }, [id, loadOrder, stopPolling])
  );

  // Also stop polling if order reaches terminal status after initial load
  useEffect(() => {
    if (order && TERMINAL_STATUSES.includes(order.status)) {
      stopPolling();
    }
  }, [order, stopPolling]);

  const detailTitle = t('profile.order_detail_title');
  const errorTitle = t('profile.order_error_title');

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
        <Stack.Screen options={{ title: errorTitle }} />
        <Text style={{ color: COLORS.danger, fontSize: 16, textAlign: 'center' }}>
          {error ?? t('profile.order_not_found')}
        </Text>
      </View>
    );
  }

  const statusConfig: Record<string, { color: string; bg: string }> = {
    pending: { color: COLORS.warning, bg: 'rgba(217,145,58,0.12)' },
    accepted: { color: COLORS.success, bg: 'rgba(22,163,74,0.12)' },
    preparing: { color: '#D97706', bg: 'rgba(217,119,6,0.12)' },
    picked_up: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
    delivered: { color: COLORS.success, bg: 'rgba(22,163,74,0.12)' },
    rejected: { color: COLORS.danger, bg: 'rgba(220,38,38,0.12)' },
    completed: { color: '#0891B2', bg: 'rgba(8,145,178,0.12)' },
    cancelled: { color: COLORS.textSecondary, bg: 'rgba(74,88,120,0.12)' },
  };

  const status = statusConfig[order.status] ?? statusConfig.pending;
  const statusLabel = t(`status.${order.status}`);
  const shortId = order.id.slice(0, 8).toUpperCase();
  const dateDisplay = formatDate(order.created_at);

  const hasFeesBreakdown = order.subtotal > 0;
  const displaySubtotal = hasFeesBreakdown ? order.subtotal : order.total;
  const displayDelivery = hasFeesBreakdown ? order.delivery_fee : 0;
  const displayService = hasFeesBreakdown ? order.service_fee : 0;

  const orderNumberLabel = t('profile.order_number');
  const customerInfoLabel = t('profile.order_customer_info');
  const itemsLabel = t('profile.order_items');
  const nameLabel = t('common.name');
  const phoneLabel = t('common.phone');
  const addressLabel = t('common.address');
  const notesLabel = t('common.notes');
  const subtotalLabel = t('common.subtotal');
  const deliveryLabel = t('common.delivery_fee');
  const serviceLabel = t('common.service_fee');
  const grandTotalLabel = t('common.grand_total');
  const trackingTitle = t('profile.order_tracking_title');
  const rejectedMsg = t('profile.order_was_rejected');
  const cancelledMsg = t('profile.order_was_cancelled');

  const isRejected = order.status === 'rejected';
  const isCancelled = order.status === 'cancelled';
  const isTerminalBad = isRejected || isCancelled;

  // Build history lookup: normalize 'completed' → 'delivered'
  const historyMap: Record<string, string> = {};
  const history: OrderStatusHistoryEntry[] = order.status_history ?? [];
  history.forEach((entry) => {
    const key = entry.status === 'completed' ? 'delivered' : entry.status;
    if (!historyMap[key]) {
      historyMap[key] = entry.created_at;
    }
  });

  // Determine active stage index
  const currentStageIndex = PIPELINE_STAGES.findIndex((s) => s.status === order.status);
  const effectiveActiveIndex = currentStageIndex >= 0 ? currentStageIndex : PIPELINE_STAGES.length - 1;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title: `${t('common.order_number_prefix')}${shortId}` }} />

      {/* Receipt header */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: 'center',
          boxShadow: '0 1px 3px rgba(15,30,71,0.04), 0 4px 12px rgba(15,30,71,0.03)',
        }}
      >
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>
          {orderNumberLabel}
        </Text>
        <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5, marginBottom: 12 }}>
          #{shortId}
        </Text>
        <View
          style={{
            backgroundColor: status.bg,
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 6,
            marginBottom: 12,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: status.color }}>
            {statusLabel}
          </Text>
        </View>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>{dateDisplay}</Text>
      </View>

      {/* Order tracking timeline */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 16,
          padding: 16,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 16 }}>
          {trackingTitle}
        </Text>

        {/* Rejected / cancelled callout */}
        {isTerminalBad ? (
          <View
            style={{
              backgroundColor: 'rgba(220,38,38,0.08)',
              borderRadius: 10,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: 'rgba(220,38,38,0.2)',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.danger }}>
              {isRejected ? rejectedMsg : cancelledMsg}
            </Text>
          </View>
        ) : null}

        {/* Timeline stages */}
        {PIPELINE_STAGES.map((stage, index) => {
          const historyTs = historyMap[stage.status];
          const isCompleted = !!historyTs || (stage.status === order.status && TERMINAL_STATUSES.includes(order.status) && !isTerminalBad);
          const isActive = !isTerminalBad && stage.status === order.status;
          const prevCompleted = index === 0 ? true : !!historyMap[PIPELINE_STAGES[index - 1].status];
          const timestamp = historyTs ? formatShortDate(historyTs) : undefined;

          return (
            <TimelineStage
              key={stage.status}
              label={t(stage.labelKey)}
              isCompleted={isCompleted}
              isActive={isActive}
              timestamp={timestamp}
              isLast={index === PIPELINE_STAGES.length - 1}
              prevCompleted={prevCompleted}
            />
          );
        })}
      </View>

      {/* Customer info */}
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
        {order.customer_name ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{nameLabel}</Text>
            <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '500' }}>{order.customer_name}</Text>
          </View>
        ) : null}
        {order.customer_phone ? (
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>{phoneLabel}</Text>
            <Text style={{ fontSize: 14, color: COLORS.text, fontWeight: '500' }} selectable>{order.customer_phone}</Text>
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
              <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
                x{item.quantity}
              </Text>
            </View>
            <PriceText value={item.unit_price * item.quantity} size={14} />
          </View>
        ))}

        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            borderStyle: 'dashed',
            marginVertical: 12,
          }}
        />

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
  );
}
