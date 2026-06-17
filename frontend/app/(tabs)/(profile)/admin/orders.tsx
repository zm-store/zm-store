import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { ChevronLeft, ClipboardList } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { PriceText } from '@/components/PriceText';
import { EmptyState } from '@/components/EmptyState';
import { COLORS } from '@/constants/Colors';
import { adminListOrders, adminUpdateOrderStatus, adminGetPendingOrderCount, Order, OrderStatus } from '@/utils/zmstore';
import { useLanguage } from '@/lib/i18n';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function AdminOrdersScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('');
  const [pendingCount, setPendingCount] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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

  const FILTER_OPTIONS: { label: string; value: string }[] = [
    { label: t('admin.orders_filter_all'), value: '' },
    { label: t('status.pending'), value: 'pending' },
    { label: t('status.accepted'), value: 'accepted' },
    { label: t('status.rejected'), value: 'rejected' },
    { label: t('status.completed'), value: 'completed' },
  ];

  const loadOrders = useCallback(async () => {
    console.log(`[AdminOrders] Loading orders, filter=${filter}`);
    try {
      const [data, countResult] = await Promise.all([
        adminListOrders(filter || undefined),
        adminGetPendingOrderCount(),
      ]);
      setOrders(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setPendingCount(countResult.count);
    } catch (e) {
      console.error('[AdminOrders] Load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadOrders();
  }, [loadOrders]);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders])
  );

  const handleRefresh = () => {
    console.log('[AdminOrders] Pull to refresh');
    setRefreshing(true);
    loadOrders();
  };

  const handleQuickAction = async (orderId: string, status: 'accepted' | 'rejected') => {
    console.log(`[AdminOrders] Quick action: ${status} for order ${orderId}`);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActionLoading(`${orderId}-${status}`);
    try {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
      await adminUpdateOrderStatus(orderId, status);
      const [data, countResult] = await Promise.all([
        adminListOrders(filter || undefined),
        adminGetPendingOrderCount(),
      ]);
      setOrders(data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
      setPendingCount(countResult.count);
    } catch (e: any) {
      console.error('[AdminOrders] Quick action error:', e);
      loadOrders();
      Alert.alert(t('common.error'), e?.message ?? t('admin.orders_error'));
    } finally {
      setActionLoading(null);
    }
  };

  const emptyTitle = t('admin.orders_empty_title');
  const emptySubtitle = t('admin.orders_empty_subtitle');
  const acceptLabel = t('admin.orders_accept');
  const rejectLabel = t('admin.orders_reject');

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}
      >
        {FILTER_OPTIONS.map((opt) => {
          const isPending = opt.value === 'pending';
          const isActive = filter === opt.value;
          return (
            <AnimatedPressable
              key={opt.value}
              onPress={() => {
                console.log(`[AdminOrders] Filter changed: ${opt.value}`);
                setFilter(opt.value);
              }}
              style={{
                paddingHorizontal: 14,
                paddingVertical: 8,
                borderRadius: 20,
                backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                borderWidth: 1,
                borderColor: isActive ? COLORS.primary : COLORS.border,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: '600',
                  color: isActive ? '#FFF' : COLORS.text,
                }}
              >
                {opt.label}
              </Text>
              {isPending && pendingCount > 0 ? (
                <View
                  style={{
                    backgroundColor: isActive ? 'rgba(255,255,255,0.3)' : '#EF4444',
                    borderRadius: 9,
                    minWidth: 18,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                    {pendingCount > 99 ? '99+' : String(pendingCount)}
                  </Text>
                </View>
              ) : null}
            </AnimatedPressable>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 120 }}
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
          renderItem={({ item }) => {
            const status = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.pending;
            const statusLabel = t(`status.${item.status}`);
            const shortId = item.id.slice(0, 8).toUpperCase();
            const dateDisplay = formatDate(item.created_at);
            const isPending = item.status === 'pending';
            const acceptKey = `${item.id}-accepted`;
            const rejectKey = `${item.id}-rejected`;

            return (
              <AnimatedPressable
                onPress={() => {
                  console.log(`[AdminOrders] Order pressed: ${item.id}`);
                  router.push(`/(tabs)/(profile)/admin/order/${item.id}`);
                }}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: isPending ? COLORS.warning : COLORS.border,
                  gap: 10,
                }}
              >
                {/* Top row */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {isPending && (
                    <View
                      style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: COLORS.warning,
                      }}
                    />
                  )}
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text }}>
                        #{shortId}
                      </Text>
                      <View style={{ backgroundColor: status.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: status.color }}>{statusLabel}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 }}>
                      {item.customer_name}
                    </Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>{dateDisplay}</Text>
                      <PriceText value={item.total} size={13} />
                    </View>
                  </View>
                  <ChevronLeft size={18} color={COLORS.textTertiary} />
                </View>

                {/* Inline accept/reject for pending orders */}
                {isPending ? (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <AnimatedPressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleQuickAction(item.id, 'accepted');
                      }}
                      disabled={!!actionLoading}
                      style={{
                        flex: 1,
                        backgroundColor: COLORS.success,
                        borderRadius: 10,
                        height: 38,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: actionLoading === acceptKey ? 0.6 : 1,
                      }}
                    >
                      {actionLoading === acceptKey ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{acceptLabel}</Text>
                      )}
                    </AnimatedPressable>
                    <AnimatedPressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleQuickAction(item.id, 'rejected');
                      }}
                      disabled={!!actionLoading}
                      style={{
                        flex: 1,
                        backgroundColor: COLORS.danger,
                        borderRadius: 10,
                        height: 38,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: actionLoading === rejectKey ? 0.6 : 1,
                      }}
                    >
                      {actionLoading === rejectKey ? (
                        <ActivityIndicator color="#FFF" size="small" />
                      ) : (
                        <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 13 }}>{rejectLabel}</Text>
                      )}
                    </AnimatedPressable>
                  </View>
                ) : null}
              </AnimatedPressable>
            );
          }}
        />
      )}
    </View>
  );
}
