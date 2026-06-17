import React from 'react';
import { View, Text } from 'react-native';
import { COLORS } from '@/constants/Colors';
import { AnimatedPressable } from '@/components/AnimatedPressable';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  onCta?: () => void;
}

export function EmptyState({ icon, title, subtitle, ctaLabel, onCta }: EmptyStateProps) {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 48,
      }}
    >
      <View
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          backgroundColor: COLORS.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          fontSize: 17,
          fontWeight: '600',
          color: COLORS.text,
          textAlign: 'center',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontSize: 15,
            color: COLORS.textSecondary,
            textAlign: 'center',
            lineHeight: 22,
            maxWidth: 280,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {ctaLabel && onCta ? (
        <AnimatedPressable
          onPress={onCta}
          style={{
            marginTop: 24,
            backgroundColor: COLORS.primary,
            borderRadius: 12,
            paddingHorizontal: 24,
            paddingVertical: 14,
          }}
        >
          <Text style={{ color: '#FFF', fontWeight: '600', fontSize: 15 }}>
            {ctaLabel}
          </Text>
        </AnimatedPressable>
      ) : null}
    </View>
  );
}
