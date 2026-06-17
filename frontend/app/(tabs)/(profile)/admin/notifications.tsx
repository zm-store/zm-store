import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { authenticatedPost } from '@/utils/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

export default function AdminNotificationsScreen() {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const titleLabel = t('admin.notif_title_label');
  const titlePlaceholder = t('admin.notif_title_placeholder');
  const bodyLabel = t('admin.notif_body_label');
  const bodyPlaceholder = t('admin.notif_body_placeholder');
  const sendBtnLabel = t('admin.notif_send_btn');

  const handleSend = async () => {
    console.log('[AdminNotifications] Send pressed, title:', title, 'body:', body);

    if (!title.trim() || !body.trim()) {
      console.log('[AdminNotifications] Validation failed — empty fields');
      Alert.alert(t('admin.notif_error_title'), t('admin.notif_error_empty'));
      return;
    }

    setSending(true);
    try {
      console.log('[AdminNotifications] POST /api/admin/notifications');
      await authenticatedPost('/api/admin/notifications', { title: title.trim(), body: body.trim() });
      console.log('[AdminNotifications] Notification sent successfully');
      Alert.alert(t('admin.notif_success_title'), t('admin.notif_success_msg'), [
        {
          text: 'OK',
          onPress: () => {
            setTitle('');
            setBody('');
          },
        },
      ]);
    } catch (e: any) {
      console.error('[AdminNotifications] Send error:', e);
      Alert.alert(t('admin.notif_error_title'), e?.message ?? t('admin.notif_error_empty'));
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: insets.bottom + 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Title field */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: COLORS.text,
              marginBottom: 8,
              textAlign: 'right',
            }}
          >
            {titleLabel}
          </Text>
          <TextInput
            value={title}
            onChangeText={(text) => {
              console.log('[AdminNotifications] Title changed');
              setTitle(text);
            }}
            placeholder={titlePlaceholder}
            placeholderTextColor={COLORS.textTertiary}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              fontSize: 16,
              color: COLORS.text,
              textAlign: 'right',
            }}
          />
        </View>

        {/* Body field */}
        <View>
          <Text
            style={{
              fontSize: 14,
              fontWeight: '600',
              color: COLORS.text,
              marginBottom: 8,
              textAlign: 'right',
            }}
          >
            {bodyLabel}
          </Text>
          <TextInput
            value={body}
            onChangeText={(text) => {
              console.log('[AdminNotifications] Body changed');
              setBody(text);
            }}
            placeholder={bodyPlaceholder}
            placeholderTextColor={COLORS.textTertiary}
            multiline
            numberOfLines={5}
            style={{
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: COLORS.border,
              padding: 14,
              fontSize: 16,
              color: COLORS.text,
              textAlign: 'right',
              minHeight: 120,
              textAlignVertical: 'top',
            }}
          />
        </View>
      </ScrollView>

      {/* Send button */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: 16,
          paddingBottom: insets.bottom + 90,
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
        }}
      >
        <AnimatedPressable
          onPress={handleSend}
          disabled={sending}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            height: 54,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: sending ? 0.7 : 1,
          }}
        >
          {sending ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>
              {sendBtnLabel}
            </Text>
          )}
        </AnimatedPressable>
      </View>
    </View>
  );
}
