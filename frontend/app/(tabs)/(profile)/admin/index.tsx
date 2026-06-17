import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TextInput, TouchableOpacity,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Redirect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { authenticatedPost } from '@/utils/api';
import { adminUpdateSettings, adminGetSettings, adminListBanners, adminCreateBanner, adminDeleteBanner, adminListProducts, adminDeleteProduct } from '@/utils/zmstore';

type TabKey = 'banners' | 'posts' | 'categories' | 'products' | 'notifications' | 'rates';

function PostsTab({ router }: { router: any }) {
  const [banners, setBanners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [imageUrl, setImageUrl] = useState('');
  const [title, setTitle] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const loadBanners = async () => {
    console.log('[PostsTab] Loading banners...');
    try {
      const data = await adminListBanners();
      setBanners(data.sort((a: any, b: any) => a.sort_order - b.sort_order));
    } catch (e) {
      console.warn('[PostsTab] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadBanners(); }, []);

  const handleAdd = async () => {
    console.log('[PostsTab] Add banner pressed, imageUrl:', imageUrl.trim());
    if (!imageUrl.trim()) {
      Alert.alert('هەڵە', 'تکایە لینکی وێنەکە بنووسە');
      return;
    }
    setSaving(true);
    try {
      console.log('[PostsTab] Creating banner...');
      await adminCreateBanner({
        image_url: imageUrl.trim(),
        title: title.trim() || undefined,
        link_url: linkUrl.trim() || undefined,
        sort_order: banners.length,
        active: true,
      });
      console.log('[PostsTab] Banner created successfully');
      setImageUrl('');
      setTitle('');
      setLinkUrl('');
      await loadBanners();
      Alert.alert('سەرکەوتوو بوو', 'پۆستەکە زیادکرا');
    } catch (e: any) {
      console.warn('[PostsTab] Create error:', e);
      Alert.alert('هەڵە', e?.message ?? 'زیادکردن سەرکەوتوو نەبوو');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    console.log('[PostsTab] Delete banner:', id);
    try {
      await adminDeleteBanner(id);
      setBanners(prev => prev.filter((b: any) => b.id !== id));
      console.log('[PostsTab] Banner deleted:', id);
    } catch (e: any) {
      console.warn('[PostsTab] Delete error:', e);
      Alert.alert('هەڵە', e?.message ?? 'سڕینەوە سەرکەوتوو نەبوو');
    }
  };

  const bannerCount = banners.length;

  return (
    <View style={{ gap: 16 }}>
      {/* Add new post card */}
      <View style={{
        backgroundColor: COLORS.surface, borderRadius: 16,
        padding: 16, borderWidth: 1, borderColor: COLORS.border,
      }}>
        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'right' }}>
          زیادکردنی پۆستی نوێ
        </Text>

        <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, textAlign: 'right' }}>
          لینکی وێنە (Image URL) *
        </Text>
        <TextInput
          value={imageUrl}
          onChangeText={(v) => {
            console.log('[PostsTab] Image URL changed');
            setImageUrl(v);
          }}
          placeholder="https://example.com/image.jpg"
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
          style={{
            backgroundColor: COLORS.surfaceSecondary, color: COLORS.text,
            padding: 12, borderRadius: 10, marginBottom: 12,
            textAlign: 'left', fontSize: 13,
            borderWidth: 1, borderColor: COLORS.border,
          }}
        />

        <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, textAlign: 'right' }}>
          ناونیشان (ناچاری نییە)
        </Text>
        <TextInput
          value={title}
          onChangeText={(v) => {
            console.log('[PostsTab] Title changed');
            setTitle(v);
          }}
          placeholder="نموونە: داشکانی تازە"
          placeholderTextColor={COLORS.textTertiary}
          style={{
            backgroundColor: COLORS.surfaceSecondary, color: COLORS.text,
            padding: 12, borderRadius: 10, marginBottom: 12,
            textAlign: 'right', fontSize: 13,
            borderWidth: 1, borderColor: COLORS.border,
          }}
        />

        <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, textAlign: 'right' }}>
          لینکی بەشەکە (ناچاری نییە)
        </Text>
        <TextInput
          value={linkUrl}
          onChangeText={(v) => {
            console.log('[PostsTab] Link URL changed');
            setLinkUrl(v);
          }}
          placeholder="/category/slug"
          placeholderTextColor={COLORS.textTertiary}
          autoCapitalize="none"
          style={{
            backgroundColor: COLORS.surfaceSecondary, color: COLORS.text,
            padding: 12, borderRadius: 10, marginBottom: 16,
            textAlign: 'left', fontSize: 13,
            borderWidth: 1, borderColor: COLORS.border,
          }}
        />

        <TouchableOpacity
          onPress={handleAdd}
          disabled={saving}
          style={{
            backgroundColor: COLORS.primary, borderRadius: 12,
            padding: 14, alignItems: 'center',
            opacity: saving ? 0.7 : 1,
          }}
        >
          {saving
            ? <ActivityIndicator color="#FFF" />
            : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>+ زیادکردنی پۆست</Text>
          }
        </TouchableOpacity>
      </View>

      {/* Existing banners list */}
      <View style={{
        backgroundColor: COLORS.surface, borderRadius: 16,
        padding: 16, borderWidth: 1, borderColor: COLORS.border,
      }}>
        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'right' }}>
          پۆستە ئێستاکەکان ({bannerCount})
        </Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
        ) : banners.length === 0 ? (
          <Text style={{ color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 20 }}>
            هیچ پۆستێک نییە
          </Text>
        ) : (
          banners.map((banner: any) => (
            <View key={banner.id} style={{
              flexDirection: 'row', alignItems: 'center', gap: 12,
              paddingVertical: 10,
              borderBottomWidth: 1, borderBottomColor: COLORS.border,
            }}>
              {banner.image_url ? (
                <Image
                  source={{ uri: banner.image_url }}
                  style={{ width: 72, height: 44, borderRadius: 8 }}
                  resizeMode="cover"
                />
              ) : (
                <View style={{ width: 72, height: 44, borderRadius: 8, backgroundColor: COLORS.surfaceSecondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Ionicons name="image-outline" size={20} color={COLORS.textTertiary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ color: COLORS.text, fontSize: 13, fontWeight: '600' }} numberOfLines={1}>
                  {banner.title || 'بێ ناونیشان'}
                </Text>
                <Text style={{ color: COLORS.textSecondary, fontSize: 11 }} numberOfLines={1}>
                  {banner.image_url}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[PostsTab] Edit banner pressed:', banner.id);
                    router.push(`/(tabs)/(profile)/admin/banner-edit?id=${banner.id}`);
                  }}
                  style={{ padding: 8, borderRadius: 8, backgroundColor: COLORS.primaryMuted }}
                >
                  <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    console.log('[PostsTab] Delete banner pressed:', banner.id);
                    Alert.alert(
                      'سڕینەوەی پۆست',
                      'دڵنیای لە سڕینەوەی ئەم پۆستە؟',
                      [
                        { text: 'نەخێر', style: 'cancel' },
                        { text: 'بەڵێ، بسڕەوە', style: 'destructive', onPress: () => handleDelete(banner.id) },
                      ]
                    );
                  }}
                  style={{ padding: 8, borderRadius: 8, backgroundColor: 'rgba(220,38,38,0.1)' }}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}

        {/* Go to full banner manager */}
        <TouchableOpacity
          onPress={() => {
            console.log('[PostsTab] Go to full banner manager pressed');
            router.push('/(tabs)/(profile)/admin/banners');
          }}
          style={{
            marginTop: 12, borderRadius: 12, padding: 12,
            borderWidth: 1, borderColor: COLORS.primary,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: COLORS.primary, fontSize: 14, fontWeight: '600' }}>
            چوون بۆ بەڕێوەبردنی تەواوی ڕیکلامەکان
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function ProductsTab({ router }: { router: any }) {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const load = async () => {
    console.log('[ProductsTab] Loading products...');
    setLoading(true);
    try {
      const data = await adminListProducts();
      console.log('[ProductsTab] Products loaded:', data.length);
      setProducts(data);
    } catch (e) {
      console.warn('[ProductsTab] Load error:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = search.trim()
    ? products.filter((p: any) =>
        p.name.toLowerCase().includes(search.trim().toLowerCase())
      )
    : products;

  const handleDelete = (id: string, name: string) => {
    console.log('[ProductsTab] Delete product pressed:', id, name);
    Alert.alert(
      'سڕینەوەی بەرهەم',
      `دڵنیای لە سڕینەوەی "${name}"؟`,
      [
        { text: 'نەخێر', style: 'cancel' },
        {
          text: 'بەڵێ، بسڕەوە',
          style: 'destructive',
          onPress: async () => {
            console.log('[ProductsTab] Confirming delete product:', id);
            try {
              await adminDeleteProduct(id);
              console.log('[ProductsTab] Product deleted:', id);
              setProducts(prev => prev.filter((p: any) => p.id !== id));
            } catch (e: any) {
              console.warn('[ProductsTab] Delete error:', e);
              Alert.alert('هەڵە', e?.message ?? 'سڕینەوە سەرکەوتوو نەبوو');
            }
          },
        },
      ]
    );
  };

  const productCount = products.length;
  const emptySearch = search.trim() ? 'هیچ بەرهەمێک نەدۆزرایەوە' : 'هیچ بەرهەمێک نییە';
  const showAddFirst = !search.trim();

  return (
    <View style={{ gap: 12 }}>
      {/* Header row: title + Add button */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => {
            console.log('[ProductsTab] Add product pressed');
            router.push('/(tabs)/(profile)/admin/product-edit');
          }}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 6,
            backgroundColor: COLORS.primary, borderRadius: 12,
            paddingHorizontal: 16, paddingVertical: 10,
          }}
        >
          <Ionicons name="add" size={18} color="#FFF" />
          <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700' }}>زیادکردنی بەرهەم</Text>
        </TouchableOpacity>
        <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700' }}>
          بەرهەمەکان ({productCount})
        </Text>
      </View>

      {/* Search */}
      <View style={{
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: COLORS.surface, borderRadius: 12,
        borderWidth: 1, borderColor: COLORS.border,
        paddingHorizontal: 12, height: 44,
      }}>
        <Ionicons name="search-outline" size={16} color={COLORS.textTertiary} />
        <TextInput
          value={search}
          onChangeText={(v) => {
            console.log('[ProductsTab] Search changed:', v);
            setSearch(v);
          }}
          placeholder="گەڕان بەدوای بەرهەمدا..."
          placeholderTextColor={COLORS.textTertiary}
          style={{ flex: 1, color: COLORS.text, fontSize: 14, textAlign: 'right' }}
        />
      </View>

      {/* Product list */}
      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 32 }} />
      ) : filtered.length === 0 ? (
        <View style={{
          backgroundColor: COLORS.surface, borderRadius: 16,
          padding: 32, alignItems: 'center',
          borderWidth: 1, borderColor: COLORS.border,
        }}>
          <Ionicons name="cube-outline" size={40} color={COLORS.textTertiary} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
            {emptySearch}
          </Text>
          {showAddFirst && (
            <TouchableOpacity
              onPress={() => {
                console.log('[ProductsTab] Add first product pressed');
                router.push('/(tabs)/(profile)/admin/product-edit');
              }}
              style={{
                marginTop: 16, backgroundColor: COLORS.primary,
                borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10,
              }}
            >
              <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 14 }}>+ زیادکردنی بەرهەمی یەکەم</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        filtered.map((item: any) => {
          const imageSource = item.image_url
            ? { uri: item.image_url }
            : { uri: 'https://via.placeholder.com/60x60/F4F6FB/0F1E47?text=Zm' };
          const priceDisplay = Number(item.price).toLocaleString();
          const stockLabel = item.in_stock ? 'بەردەستە' : 'نەماوە';
          const stockColor = item.in_stock ? '#16a34a' : COLORS.danger;
          const stockBg = item.in_stock ? 'rgba(22,163,74,0.12)' : 'rgba(220,38,38,0.12)';

          return (
            <View key={item.id} style={{
              backgroundColor: COLORS.surface, borderRadius: 14,
              padding: 12, borderWidth: 1, borderColor: COLORS.border,
              flexDirection: 'row', alignItems: 'center', gap: 12,
            }}>
              <Image
                source={imageSource}
                style={{ width: 56, height: 56, borderRadius: 10 }}
                resizeMode="cover"
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '600', color: COLORS.text }} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600', marginTop: 2 }}>
                  {priceDisplay}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textTertiary, marginTop: 1 }}>
                  د.ع
                </Text>
                <View style={{
                  alignSelf: 'flex-start', marginTop: 4,
                  backgroundColor: stockBg,
                  borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: stockColor }}>
                    {stockLabel}
                  </Text>
                </View>
              </View>
              <View style={{ gap: 8 }}>
                <TouchableOpacity
                  onPress={() => {
                    console.log(`[ProductsTab] Edit product pressed: ${item.id}`);
                    router.push(`/(tabs)/(profile)/admin/product-edit?id=${item.id}`);
                  }}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: COLORS.primaryMuted,
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="pencil-outline" size={16} color={COLORS.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDelete(item.id, item.name)}
                  style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: 'rgba(220,38,38,0.1)',
                    alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <Ionicons name="trash-outline" size={16} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

export default function AdminDashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAdmin } = useAuth();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<TabKey>('banners');

  // Notifications state
  const [notifTitle, setNotifTitle] = useState('');
  const [notifBody, setNotifBody] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

  // Rates state
  const [deliveryErbil, setDeliveryErbil] = useState('3000');
  const [serviceFeeText, setServiceFeeText] = useState('250');
  const [savingRates, setSavingRates] = useState(false);

  useEffect(() => {
    console.log('[AdminDashboard] Loading settings');
    adminGetSettings()
      .then((s) => {
        console.log('[AdminDashboard] Settings loaded:', s);
        setDeliveryErbil(String(s.delivery_fee));
        setServiceFeeText(String(s.service_fee));
      })
      .catch((err) => {
        console.warn('[AdminDashboard] Failed to load settings:', err);
      });
  }, []);

  if (!isAdmin) return <Redirect href="/(tabs)/(profile)" />;

  const handleSendNotification = async () => {
    console.log('[AdminDashboard] Send notification pressed, title:', notifTitle.trim(), 'body:', notifBody.trim());
    if (!notifTitle.trim() || !notifBody.trim()) {
      Alert.alert('هەڵە', 'تکایە سەردێڕ و ناوەڕۆک پڕ بکەرەوە');
      return;
    }
    setSendingNotif(true);
    try {
      console.log('[AdminDashboard] POST /api/admin/notifications');
      await authenticatedPost('/api/admin/notifications', {
        title: notifTitle.trim(),
        body: notifBody.trim(),
      });
      console.log('[AdminDashboard] Notification sent successfully');
      Alert.alert('سەرکەوتوو بوو', 'ئاگاداریەکە بە سەرکەوتووی نێردرا');
      setNotifTitle('');
      setNotifBody('');
    } catch (e: any) {
      console.warn('[AdminDashboard] Notification send failed:', e);
      Alert.alert('هەڵە', e?.message ?? 'ناردن سەرکەوتوو نەبوو');
    } finally {
      setSendingNotif(false);
    }
  };

  const handleSaveRates = async () => {
    const df = Number(deliveryErbil);
    const sf = Number(serviceFeeText);
    console.log('[AdminDashboard] Save rates pressed, delivery_fee:', df, 'service_fee:', sf);
    if (isNaN(df) || isNaN(sf) || df < 0 || sf < 0) {
      Alert.alert('هەڵە', 'تکایە ژمارەی دروست بنووسە');
      return;
    }
    setSavingRates(true);
    try {
      console.log('[AdminDashboard] Saving rates via adminUpdateSettings');
      await adminUpdateSettings({ delivery_fee: df, service_fee: sf });
      console.log('[AdminDashboard] Rates saved successfully');
      Alert.alert('سەرکەوتوو بوو', 'نرخەکان بە سەرکەوتووی نوێکرانەوە');
    } catch (e: any) {
      console.warn('[AdminDashboard] Save rates failed:', e);
      Alert.alert('هەڵە', e?.message ?? 'پاشەکەوتکردن سەرکەوتوو نەبوو');
    } finally {
      setSavingRates(false);
    }
  };

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'banners', label: 'ڕیکلامی سەرەوە' },
    { key: 'posts', label: 'بڵاوکردنەوەی پۆست' },
    { key: 'categories', label: 'ڕێکخستنی بەشەکان' },
    { key: 'products', label: 'بەرهەمەکان' },
    { key: 'notifications', label: 'ناردنی ئاگاداری' },
    { key: 'rates', label: 'گەیاندن و باج' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Header */}
      <View style={{
        paddingTop: insets.top + 12,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: COLORS.surface,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
      }}>
        <Text style={{ color: COLORS.text, fontSize: 18, fontWeight: '700' }}>
          پانێڵی بەڕێوبەرایەتی ZM Store
        </Text>
        <Ionicons name="settings-outline" size={24} color={COLORS.text} />
      </View>

      {/* Tab bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ backgroundColor: COLORS.surface, maxHeight: 52 }}
        contentContainerStyle={{ paddingHorizontal: 12, paddingVertical: 8, gap: 8 }}
      >
        {TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => {
              console.log('[AdminDashboard] Tab pressed:', tab.key);
              setActiveTab(tab.key);
            }}
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: activeTab === tab.key ? COLORS.primary : COLORS.surfaceSecondary,
            }}
          >
            <Text style={{
              fontSize: 13,
              fontWeight: '600',
              color: activeTab === tab.key ? '#FFF' : COLORS.textSecondary,
            }}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Banners tab */}
        {activeTab === 'banners' && (
          <View style={{
            backgroundColor: COLORS.surface, borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: COLORS.border,
          }}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'right' }}>
              بەڕێوەبردنی ڕیکلامەکان (Banners)
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 16, textAlign: 'right' }}>
              بۆ زیادکردن، دەستکاری، یان سڕینەوەی ڕیکلامەکان، بەشی بەڕێوەبردنی ڕیکلام بکەرەوە.
            </Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[AdminDashboard] Go to Banner Management pressed');
                router.push('/(tabs)/(profile)/admin/banners');
              }}
              style={{
                backgroundColor: COLORS.primary, borderRadius: 12,
                padding: 14, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>
                چوون بۆ بەڕێوەبردنی ڕیکلام
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Posts tab */}
        {activeTab === 'posts' && (
          <PostsTab router={router} />
        )}

        {/* Categories tab */}
        {activeTab === 'categories' && (
          <View style={{
            backgroundColor: COLORS.surface, borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: COLORS.border,
          }}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 12, textAlign: 'right' }}>
              بەڕێوەبردنی بەشەکان (Categories)
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 16, textAlign: 'right' }}>
              بۆ زیادکردن، دەستکاری، یان سڕینەوەی بەشەکان، بەشی بەڕێوەبردنی بەشەکان بکەرەوە.
            </Text>
            <TouchableOpacity
              onPress={() => {
                console.log('[AdminDashboard] Go to Category Management pressed');
                router.push('/(tabs)/(profile)/admin/categories');
              }}
              style={{
                backgroundColor: COLORS.primary, borderRadius: 12,
                padding: 14, alignItems: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>
                چوون بۆ بەڕێوەبردنی بەشەکان
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Products tab */}
        {activeTab === 'products' && (
          <ProductsTab router={router} />
        )}

        {/* Notifications tab */}
        {activeTab === 'notifications' && (
          <View style={{
            backgroundColor: COLORS.surface, borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: COLORS.border,
          }}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'right' }}>
              ناردنی ئاگاداری گشتی بۆ هەموو کڕیاران
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, textAlign: 'right' }}>
              سەردێڕی ئاگاداری
            </Text>
            <TextInput
              value={notifTitle}
              onChangeText={(v) => {
                console.log('[AdminDashboard] Notification title changed');
                setNotifTitle(v);
              }}
              placeholder="نموونە: داشکانی تازە!"
              placeholderTextColor={COLORS.textTertiary}
              style={{
                backgroundColor: COLORS.surfaceSecondary, color: COLORS.text,
                padding: 12, borderRadius: 10, marginBottom: 12,
                textAlign: 'right', fontSize: 14,
                borderWidth: 1, borderColor: COLORS.border,
              }}
            />
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, textAlign: 'right' }}>
              ناوەڕۆکی نامەکە
            </Text>
            <TextInput
              value={notifBody}
              onChangeText={(v) => {
                console.log('[AdminDashboard] Notification body changed');
                setNotifBody(v);
              }}
              placeholder="نموونە: داشکانی %٢٠ بۆ ماوەی ٢٤ کاتژمێر!"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              numberOfLines={3}
              style={{
                backgroundColor: COLORS.surfaceSecondary, color: COLORS.text,
                padding: 12, borderRadius: 10, marginBottom: 16,
                textAlign: 'right', fontSize: 14, minHeight: 80,
                borderWidth: 1, borderColor: COLORS.border,
              }}
            />
            <TouchableOpacity
              onPress={handleSendNotification}
              disabled={sendingNotif}
              style={{
                backgroundColor: COLORS.primary, borderRadius: 12,
                padding: 14, alignItems: 'center',
                opacity: sendingNotif ? 0.7 : 1,
              }}
            >
              {sendingNotif
                ? <ActivityIndicator color="#FFF" />
                : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>🚀 ناردنی دەستبەجێ</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Rates tab */}
        {activeTab === 'rates' && (
          <View style={{
            backgroundColor: COLORS.surface, borderRadius: 16,
            padding: 16, borderWidth: 1, borderColor: COLORS.border,
          }}>
            <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '700', marginBottom: 16, textAlign: 'right' }}>
              ڕێکخستنی نرخەکانی تێچوو
            </Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, textAlign: 'right' }}>
              نرخی گەیاندن (دینار)
            </Text>
            <TextInput
              value={deliveryErbil}
              onChangeText={(v) => {
                console.log('[AdminDashboard] Delivery fee changed:', v);
                setDeliveryErbil(v);
              }}
              keyboardType="numeric"
              style={{
                backgroundColor: COLORS.surfaceSecondary, color: COLORS.text,
                padding: 12, borderRadius: 10, marginBottom: 12,
                textAlign: 'right', fontSize: 14,
                borderWidth: 1, borderColor: COLORS.border,
              }}
            />
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 6, textAlign: 'right' }}>
              کرێی خزمەتگوزاری (دینار)
            </Text>
            <TextInput
              value={serviceFeeText}
              onChangeText={(v) => {
                console.log('[AdminDashboard] Service fee changed:', v);
                setServiceFeeText(v);
              }}
              keyboardType="numeric"
              style={{
                backgroundColor: COLORS.surfaceSecondary, color: COLORS.text,
                padding: 12, borderRadius: 10, marginBottom: 16,
                textAlign: 'right', fontSize: 14,
                borderWidth: 1, borderColor: COLORS.border,
              }}
            />
            <TouchableOpacity
              onPress={handleSaveRates}
              disabled={savingRates}
              style={{
                backgroundColor: COLORS.primary, borderRadius: 12,
                padding: 14, alignItems: 'center',
                opacity: savingRates ? 0.7 : 1,
              }}
            >
              {savingRates
                ? <ActivityIndicator color="#FFF" />
                : <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700' }}>پاشەکەوتکردنی نرخەکان</Text>
              }
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
