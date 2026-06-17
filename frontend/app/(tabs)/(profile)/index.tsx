import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  ImageSourcePropType,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronLeft, ClipboardList, Shield, LogOut, Pencil, Globe, Heart, Star, Trash2 } from 'lucide-react-native';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { COLORS } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage, Lang } from '@/lib/i18n';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { deleteMe } from '@/utils/zmstore';

function resolveImageSource(source: string | number | ImageSourcePropType | undefined): ImageSourcePropType {
  if (!source) return { uri: '' };
  if (typeof source === 'string') return { uri: source };
  return source as ImageSourcePropType;
}

function MenuItem({
  icon,
  label,
  subtitle,
  onPress,
  danger,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onPress: () => void;
  danger?: boolean;
  accent?: boolean;
}) {
  const borderColor = accent ? COLORS.accent : COLORS.border;
  const bgColor = accent ? COLORS.primaryMuted : COLORS.surface;

  return (
    <AnimatedPressable
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: bgColor,
        borderRadius: 14,
        padding: 16,
        borderWidth: accent ? 1.5 : 1,
        borderColor,
        gap: 14,
        boxShadow: accent ? '0 2px 8px rgba(212,175,55,0.12)' : undefined,
      }}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: danger
            ? 'rgba(229,72,77,0.1)'
            : accent
            ? COLORS.primaryMuted
            : COLORS.primaryMuted,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: accent ? 16 : 15,
            fontWeight: '700',
            color: danger ? COLORS.danger : accent ? COLORS.primary : COLORS.text,
          }}
        >
          {label}
        </Text>
        {subtitle ? (
          <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <ChevronLeft size={18} color={accent ? COLORS.primary : COLORS.textTertiary} />
    </AnimatedPressable>
  );
}

const LANG_OPTIONS: { key: Lang; labelKey: string }[] = [
  { key: 'ku', labelKey: 'profile.language_ku' },
  { key: 'ar', labelKey: 'profile.language_ar' },
  { key: 'en', labelKey: 'profile.language_en' },
];

function LanguageSwitcher() {
  const { lang, setLang, t } = useLanguage();

  return (
    <View
      style={{
        backgroundColor: COLORS.surface,
        borderRadius: 14,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Globe size={20} color={COLORS.primary} />
        </View>
        <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text }}>
          {t('profile.language')}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {LANG_OPTIONS.map(({ key, labelKey }) => {
          const isSelected = lang === key;
          const pillBg = isSelected ? COLORS.primary : 'transparent';
          const pillBorder = isSelected ? COLORS.primary : COLORS.border;
          const pillText = isSelected ? COLORS.surface : COLORS.text;

          return (
            <AnimatedPressable
              key={key}
              onPress={() => {
                console.log('[Profile] Language pill pressed:', key);
                setLang(key);
              }}
              style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                borderRadius: 20,
                borderWidth: 1.5,
                borderColor: pillBorder,
                backgroundColor: pillBg,
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: '700', color: pillText }}>
                {t(labelKey)}
              </Text>
            </AnimatedPressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, isAdmin, signOut } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleSignOut = async () => {
    console.log('[Profile] Sign out pressed');
    await signOut();
    router.replace('/auth-screen');
  };

  const handleDeleteAccount = () => {
    console.log('[Profile] Delete account pressed');
    Alert.alert(
      t('profile.delete_account_confirm_title'),
      t('profile.delete_account_confirm_msg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('profile.delete_account_confirm_btn'),
          style: 'destructive',
          onPress: async () => {
            console.log('[Profile] Delete account confirmed');
            try {
              await deleteMe();
              await signOut();
              router.replace('/auth-screen');
            } catch (e: any) {
              console.error('[Profile] Delete account error:', e);
              Alert.alert(t('common.error'), e?.message ?? t('profile.error_generic'));
            }
          },
        },
      ]
    );
  };

  const initials = (() => {
    const name = user?.name ?? user?.email ?? 'U';
    return name
      .split(' ')
      .slice(0, 2)
      .map((w) => w[0]?.toUpperCase() ?? '')
      .join('');
  })();

  const appVersion = Constants.expoConfig?.version ?? '1.0.0';
  const userName = user?.name ?? t('profile.user_fallback');
  const userEmail = user?.email ?? '';
  const adminBadgeText = t('profile.admin_badge');
  const editLabel = t('profile.edit');
  const wishlistLabel = t('wishlist.title');
  const ordersLabel = t('profile.orders');
  const adminPanelLabel = t('profile.admin_panel');
  const adminSubtitle = t('profile.admin_subtitle');
  const signoutLabel = t('profile.signout');
  const privacyLabel = t('profile.privacy_title');
  const deleteAccountLabel = t('profile.delete_account');
  const pointsLabel = t('profile.points');
  const pointsBalance = (user as any)?.points_balance ?? 0;
  const showPoints = pointsBalance > 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 120, gap: 12 }}
      showsVerticalScrollIndicator={false}
    >
      {/* User card */}
      <View
        style={{
          backgroundColor: COLORS.surface,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: COLORS.border,
          alignItems: 'center',
          marginBottom: 8,
          boxShadow: '0 1px 3px rgba(15,30,71,0.06), 0 4px 12px rgba(15,30,71,0.04)',
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 12,
            borderWidth: 2,
            borderColor: COLORS.primary,
            overflow: 'hidden',
          }}
        >
          {user?.image ? (
            <Image
              source={resolveImageSource(user.image)}
              style={{ width: 72, height: 72, borderRadius: 36 }}
              resizeMode="cover"
            />
          ) : (
            <Text style={{ fontSize: 26, fontWeight: '700', color: COLORS.primary }}>
              {initials}
            </Text>
          )}
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 4 }}>
          {userName}
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textSecondary }}>
          {userEmail}
        </Text>
        {isAdmin ? (
          <View
            style={{
              marginTop: 8,
              backgroundColor: 'rgba(212,175,55,0.15)',
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 4,
              borderWidth: 1,
              borderColor: 'rgba(212,175,55,0.4)',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>
              {adminBadgeText}
            </Text>
          </View>
        ) : null}
        {showPoints ? (
          <View
            style={{
              marginTop: 10,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              backgroundColor: 'rgba(217,119,6,0.1)',
              borderRadius: 20,
              paddingHorizontal: 14,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: 'rgba(217,119,6,0.25)',
            }}
          >
            <Star size={14} color={COLORS.warning} fill={COLORS.warning} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.warning }}>
              {pointsBalance}
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: COLORS.warning }}>
              {pointsLabel}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Language switcher */}
      <LanguageSwitcher />

      {/* Menu items */}
      <MenuItem
        icon={<Pencil size={20} color={COLORS.primary} />}
        label={editLabel}
        onPress={() => {
          console.log('[Profile] Edit profile pressed');
          router.push('/(tabs)/(profile)/edit');
        }}
      />

      <MenuItem
        icon={<Heart size={20} color={COLORS.primary} />}
        label={wishlistLabel}
        onPress={() => {
          console.log('[Profile] Wishlist pressed');
          router.push('/(tabs)/(profile)/wishlist');
        }}
      />

      <MenuItem
        icon={<ClipboardList size={20} color={COLORS.primary} />}
        label={ordersLabel}
        onPress={() => {
          console.log('[Profile] Orders pressed');
          router.push('/(tabs)/(profile)/orders');
        }}
      />

      {isAdmin && (
        <MenuItem
          icon={<Shield size={22} color={COLORS.primary} />}
          label={adminPanelLabel}
          subtitle={adminSubtitle}
          accent
          onPress={() => {
            console.log('[Profile] Admin panel pressed');
            router.push('/(tabs)/(profile)/admin');
          }}
        />
      )}

      <MenuItem
        icon={<Shield size={20} color={COLORS.primary} />}
        label={privacyLabel}
        onPress={() => {
          console.log('[Profile] Privacy policy pressed');
          router.push('/(tabs)/(profile)/privacy');
        }}
      />

      <MenuItem
        icon={<LogOut size={20} color={COLORS.danger} />}
        label={signoutLabel}
        onPress={handleSignOut}
        danger
      />

      <MenuItem
        icon={<Trash2 size={20} color={COLORS.danger} />}
        label={deleteAccountLabel}
        onPress={handleDeleteAccount}
        danger
      />

      {/* Footer */}
      <Text
        style={{
          textAlign: 'center',
          fontSize: 12,
          color: COLORS.textTertiary,
          marginTop: 16,
        }}
      >
        Zm Store v{appVersion}
      </Text>
    </ScrollView>
  );
}
