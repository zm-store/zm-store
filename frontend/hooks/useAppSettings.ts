import { useState, useEffect } from 'react';
import { getSettings } from '@/utils/zmstore';
import { DELIVERY_FEE, SERVICE_FEE } from '@/utils/fees';

export function useAppSettings() {
  const [data, setData] = useState({
    deliveryFee: DELIVERY_FEE,
    serviceFee: SERVICE_FEE,
    loading: true,
  });

  useEffect(() => {
    console.log('[useAppSettings] Fetching /api/settings');
    getSettings()
      .then((r) => {
        console.log('[useAppSettings] Settings loaded:', r);
        setData({ deliveryFee: r.delivery_fee, serviceFee: r.service_fee, loading: false });
      })
      .catch((e) => {
        console.warn('[useAppSettings] Failed to load settings, using defaults:', e);
        setData((d) => ({ ...d, loading: false }));
      });
  }, []);

  return data;
}
