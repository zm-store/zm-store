import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { EmptyState } from '@/components/EmptyState';
import { COLORS } from '@/constants/Colors';
import { listMyOrders, Order, OrderStatus } from '@/utils/zmstore';
import { useLanguage } from '@/lib/i18n';
import { useAuth } from '@/contexts/AuthContext';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function OrderRow({ order }: { order: Order }) {
  const router = useRouter();
  const { t } = useLanguage();

  const statusConfig: Record<OrderStatus, { color: string; bg: string }> = {
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

  const handlePress = () => {
    console.log(`[Orders] Order pressed: ${order.id}, status: ${order.status}`);
    // Open live tracking for active orders, detail view for completed/cancelled
    const liveStatuses = ['pending', 'accepted', 'preparing', 'picked_up'];
    if (liveStatuses.includes(order.status)) {
      console.log(`[Orders] Opening tracking screen for order: ${order.id}`);
      router.push(`/order-tracking/${order.id}`);
    } else {
      console.log(`[Orders] Opening detail screen for order: ${order.id}`);
      router.push(`/(tabs)/(profile)/order/${order.id}`);
    }
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 1px 3px rgba(15,30,71,0.04)',
      }}
    >
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>
            #{shortId}
          </Text>
          <View
            style={{
              backgroundColor: status.bg,
              borderRadius: 8,
              paddingHorizontal: 8,
              paddingVertical: 3,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: status.color }}>
              {statusLabel}
            </Text>
          </View>
        </View>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 6 }}>
          {dateDisplay}
        </Text>
        <PriceText value={order.total} size={14} />
      </View>
      <ChevronLeft size={18} color={COLORS.textTertiary} />
    </AnimatedPressable>
  );
}

export default function OrdersScreen() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { t } = useLanguage();

  useEffect(() => {
    if (!authLoading && !user) {
      console.log('[Orders] No user — redirecting to auth screen');
      router.replace('/auth-screen');
    }
  }, [user, authLoading, router]);

  const loadOrders = useCallback(async () => {
    if (!user) {
      console.log('[Orders] No user — skipping load');
      setLoading(false);
      return;
    }
    console.log('[Orders] Loading orders...');
    try {
      const data = await listMyOrders();
      setOrders(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setError(null);
    } catch (e: any) {
      console.error('[Orders] Load error:', e instanceof Error ? e.message : e, e instanceof Error ? e.stack : undefined);
      setError(t('profile.orders_error'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t, user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleRefresh = () => {
    console.log('[Orders] Pull to refresh');
    setRefreshing(true);
    loadOrders();
  };

  const emptyTitle = t('profile.orders_empty_title');
  const emptySubtitle = t('profile.orders_empty_subtitle');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {error ? (
        <View style={{ margin: 16, padding: 12, backgroundColor: 'rgba(220,38,38,0.08)', borderRadius: 12 }}>
          <Text style={{ color: COLORS.danger, textAlign: 'center' }}>{error}</Text>
        </View>
      ) : null}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />
        }
        ListEmptyComponent={
          <EmptyState
            icon={<ClipboardList size={32} color={COLORS.primary} />}
            title={emptyTitle}
            subtitle={emptySubtitle}
          />
        }
        renderItem={({ item }) => <OrderRow order={item} />}
      />
    </View>
  );
}
