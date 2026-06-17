import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TextInput,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { BannerCarousel } from '@/components/BannerCarousel';
import { ProductCard } from '@/components/ProductCard';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { LoadingScreen } from '@/components/LoadingScreen';
import { COLORS } from '@/constants/Colors';
import { listBanners, listCategories, listProducts, Banner, Category, Product } from '@/utils/zmstore';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/lib/i18n';
import { Search, Bell, Sparkles, Scissors, ShoppingBag, Percent, Star, ArrowLeft } from 'lucide-react-native';

const { width } = Dimensions.get('window');

// ڕەنگە جیاوازەکان بۆ باکگراوندی کارتەکانی کاتیگۆری (وەکو ئەو نموونەیەی ناردووتە)
const CATEGORY_COLORS = [
  { bg: '#EBF5FF', text: '#1E40AF', iconBg: '#DBEAFE' }, // شینی کاڵ
  { bg: '#FEF2F2', text: '#991B1B', iconBg: '#FEE2E2' }, // سووری کاڵ
  { bg: '#F0FDF4', text: '#166534', iconBg: '#DCFCE7' }, // سەوزی کاڵ
  { bg: '#FFFBEB', text: '#92400E', iconBg: '#FEF3C7' }, // زەردی کاڵ
  { bg: '#FDF2F8', text: '#9D174D', iconBg: '#FCE7F3' }, // پەمەیی کاڵ
  { bg: '#F5F3FF', text: '#5B21B6', iconBg: '#EDE9FE' }, // مۆری کاڵ
];

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [banners, setBanners] = useState<Banner[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [bannersData, categoriesData, productsData] = await Promise.all([
        listBanners().catch(() => [] as Banner[]),
        listCategories().catch(() => [] as Category[]),
        listProducts().catch(() => [] as Product[]),
      ]);
      setBanners(bannersData.filter((b) => b.active));
      setCategories(categoriesData.sort((a, b) => a.sort_order - b.sort_order));
      setAllProducts(productsData);
    } catch (e) {
      console.error('[HomeScreen] Error loading data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const filteredProducts = searchQuery.trim()
    ? allProducts.filter((p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allProducts;

  const newProducts = allProducts.slice(0, 6);

  if (loading) return <LoadingScreen />;

  return (
    <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
      {/* 1. ڕووبەری سەرەوە و زانیاری بەکارهێنەر (Header) */}
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#FFFFFF' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ width: 45, height: 45, borderRadius: 25, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20, color: '#FFF', fontWeight: '700' }}>
                {user?.name ? user.name.charAt(0).toUpperCase() : 'ZM'}
              </Text>
            </View>
            <View>
              <Text style={{ fontSize: 13, color: '#64748B' }}>{t('home.greeting_morning')} 👋</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1E293B' }}>
                {user?.name || 'کڕیاری بەڕێز'}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }}>
            <Bell size={20} color="#334155" />
          </TouchableOpacity>
        </View>

        {/* 2. سندوقی گەڕانی گەورە (Search Bar) */}
        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', borderRadius: 16, paddingHorizontal: 14, height: 50, marginTop: 4 }}>
          <Search size={20} color="#94A3B8" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="گەڕان بەدوای ئامێر، مەکینە، یان کەلوپەلی جوانکاری..."
            placeholderTextColor="#94A3B8"
            style={{ flex: 1, fontSize: 15, color: '#1E293B', paddingHorizontal: 10, textAlign: 'right' }}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.primary} />}
      >
        {searchQuery.trim().length === 0 ? (
          <>
            {/* 2b. بانەری بەخێرهاتن */}
            <View
              style={{
                backgroundColor: '#F0FDF4',
                borderRadius: 16,
                marginHorizontal: 16,
                marginTop: 12,
                paddingVertical: 14,
                paddingHorizontal: 18,
              }}
            >
              <Text style={{ fontSize: 15, fontWeight: '700', color: '#166534', textAlign: 'center', fontFamily: 'NotoSansArabic_700Bold' }}>
                بە خێر بێى بۆ یەکەم ئەپی کوردی بۆ سەرتاشخانەکان
              </Text>
              <Text style={{ fontSize: 12, color: '#4ADE80', textAlign: 'center', marginTop: 4 }}>
                ZM Shop — کوالیتی و ستایل لە یەک شوێن
              </Text>
            </View>

            {/* 3. ڕیکلامەکان (Banner Carousel) */}
            <View style={{ marginTop: 12 }}>
              <BannerCarousel banners={banners} onBannerPress={(b) => b.link_url && router.push(`/(tabs)/(home)/category/${b.link_url.replace(/^\//, '')}`)} />
            </View>

            {/* 4. بەشی کاتیگۆرییە مۆدێرنەکان (Horizontal Scroll Circles) */}
            <View style={{ marginTop: 24 }}>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 14, textAlign: 'right', paddingHorizontal: 16 }}>
                پۆلێنەکانی ZM Shop
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              >
                {categories.map((category, index) => {
                  const styleIndex = index % CATEGORY_COLORS.length;
                  const currentStyle = CATEGORY_COLORS[styleIndex];

                  return (
                    <TouchableOpacity
                      key={category.id}
                      activeOpacity={0.8}
                      onPress={() => {
                        console.log('[HomeScreen] Category pressed:', category.name_ku, category.slug);
                        router.push(`/(tabs)/(home)/category/${category.slug}`);
                      }}
                      style={{ width: 80, alignItems: 'center' }}
                    >
                      {category.image_url ? (
                        <Image
                          source={{ uri: category.image_url }}
                          style={{ width: 64, height: 64, borderRadius: 32 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: currentStyle.iconBg, alignItems: 'center', justifyContent: 'center' }}>
                          {index % 2 === 0 ? <Scissors size={24} color={currentStyle.text} /> : <Sparkles size={24} color={currentStyle.text} />}
                        </View>
                      )}
                      <Text
                        numberOfLines={2}
                        style={{ fontSize: 11, fontWeight: '600', color: '#1E293B', textAlign: 'center', marginTop: 6 }}
                      >
                        {category.name_ku}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* 5. بەرهەمە نوێیەکان */}
            <View style={{ marginTop: 28 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, marginBottom: 14 }}>
                <TouchableOpacity><Text style={{ color: COLORS.primary, fontWeight: '600' }}>بینینی هەمووی</Text></TouchableOpacity>
                <Text style={{ fontSize: 18, fontWeight: '800', color: '#1E293B' }}>نوێترین ئامێرەکان</Text>
              </View>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 14 }}>
                {newProducts.map((product, i) => (
                  <ProductCard key={product.id} product={product} index={i} width={170} />
                ))}
              </ScrollView>
            </View>
          </>
        ) : (
          /* 6. ئەنجامی گەڕان */
          <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
            <Text style={{ fontSize: 15, color: '#64748B', marginBottom: 12, textAlign: 'right' }}>
              ئەنجامی گەڕان بۆ "{searchQuery}"
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' }}>
              {filteredProducts.map((product, i) => (
                <View key={product.id} style={{ width: '48%' }}>
                  <ProductCard product={product} index={i} />
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <WhatsAppButton />
    </View>
  );
}