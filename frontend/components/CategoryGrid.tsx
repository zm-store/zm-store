import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Animated,
  Image,
  ImageSourcePropType,
  Platform,
} from 'react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { Category } from '@/utils/zmstore';

// ─── helpers ────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  cosmetics: '💄',
  barber: '✂️',
  hair: '💇',
  skin: '🧴',
  nail: '💅',
  fragrance: '🌸',
  shaving: '🪒',
  hygiene: '🧼',
  tools: '🔧',
  color: '🎨',
  wax: '✨',
  scissors: '✂️',
  default: '🛍️',
};

function getCategoryIcon(slug: string | null | undefined): string {
  const lower = (slug ?? '').toLowerCase();
  for (const key of Object.keys(CATEGORY_ICONS)) {
    if (lower && lower.includes(key)) return CATEGORY_ICONS[key];
  }
  return CATEGORY_ICONS.default;
}

function resolveImageSource(
  source: string | number | ImageSourcePropType | undefined,
): ImageSourcePropType | null {
  if (!source) return null;
  if (typeof source === 'string') {
    const trimmed = source.trim();
    if (!trimmed) return null;
    return { uri: trimmed };
  }
  return source as ImageSourcePropType;
}

const HERO_COLORS = ['#FF6B35', '#3B82F6'] as const;

const PASTEL_PALETTE = [
  '#FFF4E6',
  '#E6F4FF',
  '#FFE6F0',
  '#E6FFF4',
  '#F4E6FF',
  '#FFFAE6',
  '#E6FAFF',
  '#FFE6E6',
] as const;

// ─── shadow helpers ──────────────────────────────────────────────────────────

const heroShadow =
  Platform.OS === 'android'
    ? { elevation: 6 }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      };

const gridShadow =
  Platform.OS === 'android'
    ? { elevation: 2 }
    : {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      };

// ─── HeroCard ────────────────────────────────────────────────────────────────

interface HeroCardProps {
  category: Category;
  index: number;
  bgColor: string;
  onPress: () => void;
}

function HeroCard({ category, index, bgColor, onPress }: HeroCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const hasImage = typeof category.image_url === 'string' && category.image_url.trim().length > 0;
  const icon = getCategoryIcon(category.slug);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: [{ translateY }],
        ...heroShadow,
        borderRadius: 24,
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        style={{
          flex: 1,
          backgroundColor: bgColor,
          borderRadius: 24,
          padding: 16,
          height: 140,
          overflow: 'hidden',
        }}
      >
        {/* Title */}
        <Text
          style={{
            fontSize: 18,
            fontWeight: '800',
            color: '#fff',
            textAlign: 'left',
            maxWidth: '65%',
          }}
          numberOfLines={2}
        >
          {category.name_ku ?? category.name_en ?? ''}
        </Text>

        {/* Subtitle */}
        <Text
          style={{
            fontSize: 12,
            color: 'rgba(255,255,255,0.85)',
            marginTop: 4,
            textAlign: 'left',
          }}
          numberOfLines={1}
        >
          {category.name_en}
        </Text>

        {/* Overlapping image / emoji */}
        <View
          style={{
            position: 'absolute',
            bottom: -10,
            right: -10,
            width: 110,
            height: 110,
          }}
        >
          {hasImage ? (
            <Image
              source={resolveImageSource(category.image_url)!}
              style={{ width: 110, height: 110 }}
              resizeMode="contain"
            />
          ) : (
            <Text
              style={{
                fontSize: 60,
                opacity: 0.75,
                textAlign: 'center',
                lineHeight: 110,
              }}
            >
              {icon}
            </Text>
          )}
        </View>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── GridCard ────────────────────────────────────────────────────────────────

interface GridCardProps {
  category: Category;
  index: number;
  onPress: () => void;
}

function GridCard({ category, index, onPress }: GridCardProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 350,
        delay: index * 50,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, opacity, translateY]);

  const hasImage = typeof category.image_url === 'string' && category.image_url.trim().length > 0;
  const icon = getCategoryIcon(category.slug);
  const bgColor = PASTEL_PALETTE[index % PASTEL_PALETTE.length];

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: [{ translateY }],
        ...gridShadow,
        borderRadius: 18,
      }}
    >
      <AnimatedPressable
        onPress={onPress}
        style={{
          flex: 1,
          backgroundColor: bgColor,
          borderRadius: 18,
          padding: 10,
          minHeight: 100,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasImage ? (
          <Image
            source={resolveImageSource(category.image_url)!}
            style={{ width: 48, height: 48 }}
            resizeMode="contain"
          />
        ) : (
          <Text style={{ fontSize: 32 }}>{icon}</Text>
        )}
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: COLORS.text,
            textAlign: 'center',
            marginTop: 8,
          }}
          numberOfLines={2}
        >
          {category.name_ku ?? category.name_en ?? ''}
        </Text>
      </AnimatedPressable>
    </Animated.View>
  );
}

// ─── CategoryGrid (exported) ─────────────────────────────────────────────────

interface CategoryGridProps {
  categories: Category[];
  onCategoryPress: (slug: string) => void;
}

export function CategoryGrid({ categories, onCategoryPress }: CategoryGridProps) {
  const safeCategories = categories.filter((c) => c && c.id && c.slug);
  if (safeCategories.length === 0) return null;

  const handlePress = (slug: string) => {
    console.log(`[CategoryGrid] category pressed: ${slug}`);
    if (!slug) {
      console.warn('[CategoryGrid] category slug is empty, skipping navigation');
      return;
    }
    onCategoryPress(slug);
  };

  // Hero section — first 1 or 2 categories
  const heroCount = Math.min(safeCategories.length, 2);
  const heroes = safeCategories.slice(0, heroCount);

  // Grid section — remaining categories (index 2+)
  const gridItems = safeCategories.slice(2);

  // Build rows of 4 for the grid
  const gridRows: Category[][] = [];
  for (let i = 0; i < gridItems.length; i += 4) {
    gridRows.push(gridItems.slice(i, i + 4));
  }

  return (
    <View style={{ paddingHorizontal: 16, gap: 14 }}>
      {/* Hero row */}
      <View style={{ flexDirection: 'row', gap: 12 }}>
        {heroes.map((cat, i) => (
          <HeroCard
            key={cat.id}
            category={cat}
            index={i}
            bgColor={HERO_COLORS[i]}
            onPress={() => handlePress(cat.slug)}
          />
        ))}
      </View>

      {/* 4-column grid */}
      {gridRows.length > 0 && (
        <View style={{ gap: 10 }}>
          {gridRows.map((row, rowIndex) => (
            <View key={rowIndex} style={{ flexDirection: 'row', gap: 10 }}>
              {row.map((cat, colIndex) => (
                <GridCard
                  key={cat.id}
                  category={cat}
                  // offset by 2 (heroes) so stagger continues naturally
                  index={2 + rowIndex * 4 + colIndex}
                  onPress={() => handlePress(cat.slug)}
                />
              ))}
              {/* Fill empty slots in last row */}
              {row.length < 4 &&
                Array.from({ length: 4 - row.length }).map((_, i) => (
                  <View key={`empty-${i}`} style={{ flex: 1 }} />
                ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
