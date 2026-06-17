import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  ScrollView,
  Image,
  Dimensions,
  ImageSourcePropType,
} from 'react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { Banner } from '@/utils/zmstore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = 180;

function resolveImageSource(source: string | undefined): ImageSourcePropType {
  if (!source) return { uri: 'https://via.placeholder.com/800x300/7A4A2B/FFFFFF?text=Zm+Store' };
  return { uri: source };
}

interface BannerCarouselProps {
  banners: Banner[];
  onBannerPress?: (banner: Banner) => void;
}

export function BannerCarousel({ banners, onBannerPress }: BannerCarouselProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const items = banners.length > 0 ? banners : [
    {
      id: 'placeholder',
      image_url: 'https://images.unsplash.com/photo-1522335789203-aaa84e5b2c87?w=800',
      title: 'Zm Store',
      link_url: undefined,
      sort_order: 0,
      active: true,
    },
  ];

  useEffect(() => {
    if (items.length <= 1) return;

    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => {
        const next = (prev + 1) % items.length;
        scrollRef.current?.scrollTo({ x: next * (SCREEN_WIDTH - 32), animated: true });
        return next;
      });
    }, 3500);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length]);

  const handleScroll = (e: any) => {
    const x = e.nativeEvent.contentOffset.x;
    const index = Math.round(x / (SCREEN_WIDTH - 32));
    setActiveIndex(index);
  };

  return (
    <View style={{ marginHorizontal: 16, marginTop: 8 }}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={{ borderRadius: 16, overflow: 'hidden' }}
        contentContainerStyle={{ gap: 0 }}
      >
        {items.map((banner, i) => (
          <AnimatedPressable
            key={banner.id}
            scaleValue={0.98}
            onPress={() => {
              console.log(`[BannerCarousel] Banner pressed: ${banner.id}`);
              onBannerPress?.(banner);
            }}
            style={{ width: SCREEN_WIDTH - 32 }}
          >
            <Image
              source={resolveImageSource(banner.image_url)}
              style={{
                width: SCREEN_WIDTH - 32,
                height: BANNER_HEIGHT,
                borderRadius: 16,
              }}
              resizeMode="cover"
            />
            {/* Gradient overlay */}
            <View
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: 60,
                borderBottomLeftRadius: 16,
                borderBottomRightRadius: 16,
                backgroundColor: 'rgba(27, 23, 20, 0.35)',
              }}
            />
          </AnimatedPressable>
        ))}
      </ScrollView>

      {/* Dots */}
      {items.length > 1 && (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 6,
            marginTop: 10,
          }}
        >
          {items.map((_, i) => (
            <View
              key={i}
              style={{
                width: i === activeIndex ? 16 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: i === activeIndex ? COLORS.primary : COLORS.textTertiary,
              }}
            />
          ))}
        </View>
      )}
    </View>
  );
}
