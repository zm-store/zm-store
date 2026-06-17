import React from 'react';
import { Text, TextStyle, StyleProp } from 'react-native';
import { COLORS } from '@/constants/Colors';

interface PriceTextProps {
  value: number | string | undefined;
  style?: StyleProp<TextStyle>;
  size?: number;
  color?: string;
}

export function PriceText({ value, style, size = 15, color }: PriceTextProps) {
  const numericValue = Number(value) || 0;
  const formatted = numericValue.toLocaleString('en-US');
  const displayText = `${formatted} د.ع`;

  return (
    <Text
      style={[
        {
          fontSize: size,
          fontWeight: '700',
          color: color ?? COLORS.primary,
          fontVariant: ['tabular-nums'],
        },
        style,
      ]}
    >
      {displayText}
    </Text>
  );
}
