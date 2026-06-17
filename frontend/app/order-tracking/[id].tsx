import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  Animated,
  Platform,
  Linking,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronLeft, MapPin } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { apiGet } from '@/utils/api';

// ─── Types ───────────────────────────────────────────────────────────────────

type TrackingStatus = 'pending' | 'confirmed' | 'preparing' | 'in_delivery' | 'delivered';

interface TrackingData {
  order_id: string;
  status: TrackingStatus;
  customer_name: string;
  delivery_address: string;
  created_at: string;
  eta_minutes?: number;
  rider?: { name: string; phone: string; lat: number; lng: number };
  destination?: { lat: number; lng: number };
  history: { status: string; created_at: string }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAP_HEIGHT = SCREEN_HEIGHT * 0.55;
const CARD_HEIGHT = SCREEN_HEIGHT * 0.45;

const PIPELINE_STEPS: { key: TrackingStatus; label: string; labelKu: string }[] = [
  { key: 'pending',     label: 'Pending',     labelKu: 'چاوەڕوانکردن' },
  { key: 'confirmed',   label: 'Confirmed',   labelKu: 'پشتڕاستکراوە' },
  { key: 'preparing',   label: 'Preparing',   labelKu: 'ئامادەکردن' },
  { key: 'in_delivery', label: 'In Delivery', labelKu: 'لە گەیاندندایە' },
  { key: 'delivered',   label: 'Delivered',   labelKu: 'گەیشت' },
];

const STATUS_CONFIG: Record<TrackingStatus, { color: string; bg: string; label: string; labelKu: string }> = {
  pending:     { color: '#8A93AB', bg: 'rgba(138,147,171,0.15)', label: 'Pending',     labelKu: 'چاوەڕوانکردن' },
  confirmed:   { color: '#1E3A8A', bg: 'rgba(30,58,138,0.12)',   label: 'Confirmed',   labelKu: 'پشتڕاستکراوە' },
  preparing:   { color: '#D97706', bg: 'rgba(217,119,6,0.12)',   label: 'Preparing',   labelKu: 'ئامادەکردن' },
  in_delivery: { color: '#16A34A', bg: 'rgba(22,163,74,0.12)',   label: 'In Delivery', labelKu: 'لە گەیاندندایە' },
  delivered:   { color: '#0F1E47', bg: 'rgba(15,30,71,0.10)',    label: 'Delivered',   labelKu: 'گەیشت' },
};

const STEP_INDEX: Record<TrackingStatus, number> = {
  pending: 0, confirmed: 1, preparing: 2, in_delivery: 3, delivered: 4,
};

// ─── Map (placeholder — native maps removed) ─────────────────────────────────

function MapSection({ tracking: _tracking }: { tracking: TrackingData }) {
  return (
    <View
      style={{
        height: MAP_HEIGHT,
        backgroundColor: '#1A2647',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <MapPin size={48} color={COLORS.accent} />
      <Text style={{ fontSize: 14, color: '#A0AABF', marginTop: 8 }}>
        نەخشە بەردەست نییە
      </Text>
    </View>
  );
}

// ─── Pulsing dot ──────────────────────────────────────────────────────────────

function PulsingDot() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 500, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1,   duration: 500, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [scale]);

  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.success,
        marginLeft: 6,
        transform: [{ scale }],
      }}
    />
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ status }: { status: TrackingStatus }) {
  const currentIndex = STEP_INDEX[status] ?? 0;
  const pulseScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.35, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1,    duration: 600, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulseScale]);

  return (
    <View style={{ marginTop: 16 }}>
      {/* Step circles + connecting lines */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {PIPELINE_STEPS.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isActive = index === currentIndex;
          const isFuture = index > currentIndex;

          const circleColor = isCompleted
            ? COLORS.primary
            : isActive
            ? COLORS.accent
            : COLORS.border;

          return (
            <React.Fragment key={step.key}>
              {/* Circle */}
              {isActive ? (
                <Animated.View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: COLORS.accent,
                    transform: [{ scale: pulseScale }],
                  }}
                />
              ) : (
                <View
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: isFuture ? 'transparent' : circleColor,
                    borderWidth: isFuture ? 1.5 : 0,
                    borderColor: COLORS.border,
                  }}
                />
              )}

              {/* Connecting line */}
              {index < PIPELINE_STEPS.length - 1 ? (
                <View
                  style={{
                    flex: 1,
                    height: 2,
                    backgroundColor: index < currentIndex ? COLORS.primary : COLORS.border,
                  }}
                />
              ) : null}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels */}
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        {PIPELINE_STEPS.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex;
          return (
            <View key={step.key} style={{ flex: index < PIPELINE_STEPS.length - 1 ? 1 : 0, alignItems: index === 0 ? 'flex-start' : index === PIPELINE_STEPS.length - 1 ? 'flex-end' : 'center' }}>
              <Text
                style={{
                  fontSize: 9,
                  fontWeight: isActive || isCompleted ? '600' : '400',
                  color: isActive ? COLORS.accent : isCompleted ? COLORS.primary : COLORS.textTertiary,
                  textAlign: 'center',
                }}
                numberOfLines={2}
              >
                {step.labelKu}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── Bottom card ──────────────────────────────────────────────────────────────

function BottomCard({ tracking }: { tracking: TrackingData }) {
  const cfg = STATUS_CONFIG[tracking.status] ?? STATUS_CONFIG.pending;
  const isInDelivery = tracking.status === 'in_delivery';
  const showRider = isInDelivery || tracking.status === 'delivered';
  const shortId = tracking.order_id.slice(-6).toUpperCase();

  const etaText = tracking.eta_minutes != null
    ? `${tracking.eta_minutes} mins away`
    : null;

  const handlePhone = () => {
    if (!tracking.rider?.phone) return;
    console.log('[OrderTracking] Phone button pressed:', tracking.rider.phone);
    Linking.openURL(`tel:${tracking.rider.phone}`);
  };

  const handleMessage = () => {
    if (!tracking.rider?.phone) return;
    console.log('[OrderTracking] Message button pressed:', tracking.rider.phone);
    Linking.openURL(`sms:${tracking.rider.phone}`);
  };

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingBottom: 32,
        minHeight: CARD_HEIGHT,
        shadowColor: '#0F1E47',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.10,
        shadowRadius: 20,
        elevation: 12,
      }}
    >
      {/* Row 1: Status pill + ETA */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        {/* Status pill */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: cfg.bg,
            borderRadius: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: cfg.color }}>
            {cfg.labelKu}
          </Text>
          {isInDelivery ? <PulsingDot /> : null}
        </View>

        {/* ETA */}
        {etaText != null ? (
          <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.primary, letterSpacing: -0.5 }}>
            {etaText}
          </Text>
        ) : null}
      </View>

      {/* Row 2: Progress bar */}
      <ProgressBar status={tracking.status} />

      {/* Row 3: Divider */}
      <View style={{ height: 1, backgroundColor: COLORS.divider, marginVertical: 16 }} />

      {/* Row 4: Rider info */}
      {showRider && tracking.rider ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
            {/* Avatar */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 22,
                backgroundColor: COLORS.surfaceSecondary,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <Text style={{ fontSize: 22 }}>🧑‍💼</Text>
            </View>

            {/* Name + subtitle */}
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>
                {tracking.rider.name}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 1 }}>
                Your Rider
              </Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <AnimatedPressable
                onPress={handlePhone}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>📞</Text>
              </AnimatedPressable>
              <AnimatedPressable
                onPress={handleMessage}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 18 }}>💬</Text>
              </AnimatedPressable>
            </View>
          </View>

          {/* Divider after rider */}
          <View style={{ height: 1, backgroundColor: COLORS.divider, marginBottom: 16 }} />
        </>
      ) : null}

      {/* Row 5: Delivery address */}
      {tracking.delivery_address ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12, gap: 8 }}>
          <MapPin size={15} color={COLORS.textSecondary} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 }}>
            {tracking.delivery_address}
          </Text>
        </View>
      ) : null}

      {/* Row 6: Order ID */}
      <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>
        Order #{shortId}
      </Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function OrderTrackingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [tracking, setTracking] = useState<TrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTracking = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) console.log(`[OrderTracking] Fetching tracking for order: ${id}`);
    try {
      const data = await apiGet<TrackingData>(`/api/orders/${id}/tracking`);
      console.log(`[OrderTracking] Status: ${data.status}, ETA: ${data.eta_minutes} mins`);
      setTracking(data);
      setError(null);
      return data;
    } catch (e: any) {
      console.error('[OrderTracking] Fetch error:', e?.message ?? e);
      if (!silent) setError('Order not found');
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [id]);

  // Initial load
  useEffect(() => {
    fetchTracking(false);
  }, [fetchTracking]);

  // Poll every 8s when in_delivery
  useEffect(() => {
    if (!tracking) return;

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    if (tracking.status === 'in_delivery') {
      console.log('[OrderTracking] Starting 8s poll (in_delivery)');
      intervalRef.current = setInterval(async () => {
        console.log('[OrderTracking] Polling tracking...');
        const data = await fetchTracking(true);
        if (data && data.status !== 'in_delivery') {
          console.log('[OrderTracking] Status changed, stopping poll');
          stopPolling();
          setTracking(data);
        }
      }, 8000);
    } else {
      stopPolling();
    }

    return stopPolling;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracking?.status, fetchTracking]);

  const handleBack = () => {
    console.log('[OrderTracking] Back button pressed');
    router.back();
  };

  // ── Loading ──
  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={{ marginTop: 12, fontSize: 14, color: COLORS.textSecondary }}>
          Loading tracking...
        </Text>
      </View>
    );
  }

  // ── Error ──
  if (error || !tracking) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 16, color: COLORS.danger, textAlign: 'center', marginBottom: 20 }}>
          Order not found
        </Text>
        <AnimatedPressable
          onPress={handleBack}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingHorizontal: 24,
            paddingVertical: 12,
          }}
        >
          <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 15 }}>Go Back</Text>
        </AnimatedPressable>
      </View>
    );
  }

  // ── Main ──
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Map */}
      <MapSection tracking={tracking} />

      {/* Bottom card */}
      <BottomCard tracking={tracking} />

      {/* Floating back button */}
      <View
        style={{
          position: 'absolute',
          top: insets.top + 12,
          left: 16,
        }}
      >
        <AnimatedPressable
          onPress={handleBack}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#0F1E47',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.14,
            shadowRadius: 8,
            elevation: 6,
          }}
        >
          <ChevronLeft size={22} color={COLORS.primary} />
        </AnimatedPressable>
      </View>
    </View>
  );
}
