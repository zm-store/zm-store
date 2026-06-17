import React from 'react';
import { View, Text, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { COLORS } from '@/constants/Colors';
import { useLanguage } from '@/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PrivacyScreen() {
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const title = t('profile.privacy_title');
  const lastUpdatedLabel = t('profile.privacy_last_updated');
  const bodyText = t('profile.privacy_body');

  const today = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const sections = bodyText.split('\n\n');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40, gap: 0 }}
      showsVerticalScrollIndicator={false}
    >
      <Stack.Screen options={{ title }} />

      {/* Header card */}
      <View
        style={{
          backgroundColor: COLORS.primaryMuted,
          borderRadius: 16,
          padding: 20,
          marginBottom: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 6 }}>
          {title}
        </Text>
        <Text style={{ fontSize: 13, color: COLORS.textSecondary }}>
          {lastUpdatedLabel}
          {': '}
          {today}
        </Text>
      </View>

      {/* Body sections */}
      {sections.map((section, index) => {
        const lines = section.split('\n');
        const isHeading = lines.length > 1 && lines[0].trim().length > 0 && !lines[0].startsWith(' ');
        const heading = isHeading ? lines[0] : null;
        const body = isHeading ? lines.slice(1).join('\n').trim() : section.trim();

        return (
          <View
            key={index}
            style={{
              backgroundColor: COLORS.surface,
              borderRadius: 14,
              padding: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
            }}
          >
            {heading ? (
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: '700',
                  color: COLORS.primary,
                  marginBottom: 8,
                }}
              >
                {heading}
              </Text>
            ) : null}
            <Text
              style={{
                fontSize: 14,
                color: COLORS.textSecondary,
                lineHeight: 22,
              }}
            >
              {body}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
