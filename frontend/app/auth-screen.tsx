import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import Constants from 'expo-constants';
import { useAuth } from '@/contexts/AuthContext';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LoadingButton } from '@/components/LoadingButton';
import { COLORS } from '@/constants/Colors';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '@/lib/i18n';

function AppleLogo({ size = 20, color = '#FFFFFF' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 22C7.78997 22.05 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
    </Svg>
  );
}

function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" fill="#FFC107" />
      <Path d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" fill="#FF3D00" />
      <Path d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" fill="#4CAF50" />
      <Path d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" fill="#1976D2" />
    </Svg>
  );
}

export default function AuthScreen() {
  const { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail, user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();

  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  const [loadingApple, setLoadingApple] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showEmail, setShowEmail] = useState(false);
  const [emailMode, setEmailMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailName, setEmailName] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);

  useEffect(() => {
    if (user) {
      console.log('[AuthScreen] User authenticated, navigating to tabs');
      router.replace('/(tabs)/(home)');
    }
  }, [user, router]);

  const handleApple = async () => {
    console.log('[AuthScreen] Apple sign-in pressed');
    setError(null);
    setLoadingApple(true);
    try {
      await signInWithApple();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === 'Authentication cancelled') {
        console.log('[AuthScreen] Apple sign-in cancelled by user');
      } else {
        console.error('[AuthScreen] Apple sign-in error:', msg, e?.stack);
        setError(`Apple Error: ${msg}`);
      }
    } finally {
      setLoadingApple(false);
    }
  };

  const handleGoogle = async () => {
    console.log('[AuthScreen] Google sign-in pressed');
    setError(null);
    setLoadingGoogle(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      if (msg === 'Authentication cancelled') {
        console.log('[AuthScreen] Google sign-in cancelled by user');
      } else {
        console.error('[AuthScreen] Google sign-in error:', msg, e?.stack);
        setError(`Google Error: ${msg}`);
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const handleEmailSubmit = async () => {
    console.log('[AuthScreen] Email submit pressed, mode:', emailMode, 'email:', email.trim());
    setError(null);
    if (!email.trim() || !password.trim()) {
      setError(t('auth.error_email_required'));
      return;
    }
    setLoadingEmail(true);
    try {
      if (emailMode === 'signup') {
        console.log('[AuthScreen] Signing up with email');
        await signUpWithEmail(email.trim(), password, emailName.trim() || undefined);
      } else {
        console.log('[AuthScreen] Signing in with email');
        await signInWithEmail(email.trim(), password);
      }
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error('[AuthScreen] Email sign-in error:', msg, e?.stack);
      const isCredentialError = msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('credential');
      setError(isCredentialError ? t('auth.error_invalid_credentials') : `Email Error: ${msg}`);
    } finally {
      setLoadingEmail(false);
    }
  };

  const handleToggleEmailMode = () => {
    setEmailMode(prev => prev === 'signin' ? 'signup' : 'signin');
    setError(null);
  };

  const handleToggleShowEmail = () => {
    setShowEmail(prev => !prev);
    setError(null);
  };

  const taglineText = t('auth.tagline');
  const signInAppleText = t('auth.sign_in_apple');
  const signInGoogleText = t('auth.sign_in_google');
  const termsText = t('auth.terms');
  const expoGoWarningText = t('auth.expo_go_warning');
  const orText = t('auth.or');
  const signInEmailText = t('auth.sign_in_email');
  const emailLabelText = t('auth.email_label');
  const passwordLabelText = t('auth.password_label');
  const nameLabelText = t('auth.name_label');
  const continueText = t('auth.continue');
  const noAccountText = t('auth.no_account');
  const haveAccountText = t('auth.have_account');
  const signUpEmailText = t('auth.sign_up_email');
  const emailModeTitle = emailMode === 'signin' ? signInEmailText : signUpEmailText;
  const toggleModeText = emailMode === 'signin' ? noAccountText : haveAccountText;

  const socialDisabled = loadingApple || loadingGoogle || loadingEmail;
  const emailSubmitDisabled = loadingApple || loadingGoogle;

  return (
    <LinearGradient
      colors={['#0A1228', '#0F1E47', '#1E3A8A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1 }}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          paddingTop: insets.top + 40,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 24,
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero section */}
        <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <View
            style={{
              width: 80,
              height: 80,
              borderRadius: 40,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1.5,
              borderColor: 'rgba(255,255,255,0.25)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
            }}
          >
            <Text style={{ fontSize: 36 }}>✨</Text>
          </View>

          <Text style={{ fontSize: 42, fontWeight: '800', color: '#FFFFFF', textAlign: 'center', marginBottom: 8 }}>
            Zm Store
          </Text>

          <Text style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', lineHeight: 24, marginBottom: 8 }}>
            {taglineText}
          </Text>

          <View style={{ width: 40, height: 2, backgroundColor: 'rgba(255,255,255,0.4)', borderRadius: 1, marginTop: 16 }} />
        </View>

        {/* Auth buttons */}
        <View style={{ width: '100%', gap: 12 }}>
          {error ? (
            <View style={{ backgroundColor: 'rgba(220, 38, 38, 0.2)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(220, 38, 38, 0.4)', marginBottom: 4 }}>
              <Text style={{ color: '#FF6B6B', textAlign: 'center', fontSize: 14 }}>
                {error}
              </Text>
            </View>
          ) : null}

          {isExpoGo ? (
            <View style={{ backgroundColor: 'rgba(251, 191, 36, 0.15)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.4)', marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.9)', textAlign: 'center', fontSize: 13, lineHeight: 20 }}>
                {expoGoWarningText}
              </Text>
            </View>
          ) : null}

          {/* Apple Button */}
          <AnimatedPressable
            onPress={handleApple}
            disabled={socialDisabled}
            style={{
              backgroundColor: '#000000',
              borderRadius: 14,
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.15)',
              opacity: socialDisabled ? 0.5 : 1,
            }}
          >
            {loadingApple ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <AppleLogo size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
                  {signInAppleText}
                </Text>
              </>
            )}
          </AnimatedPressable>

          {/* Google Button */}
          <AnimatedPressable
            onPress={handleGoogle}
            disabled={socialDisabled}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: 14,
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 10,
              borderWidth: 1,
              borderColor: 'rgba(0,0,0,0.08)',
              opacity: socialDisabled ? 0.5 : 1,
            }}
          >
            {loadingGoogle ? (
              <ActivityIndicator color={COLORS.primary} size="small" />
            ) : (
              <>
                <GoogleLogo size={20} />
                <Text style={{ color: COLORS.primary, fontSize: 16, fontWeight: '600' }}>
                  {signInGoogleText}
                </Text>
              </>
            )}
          </AnimatedPressable>

          {/* Divider */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 }}>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
            <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' }}>
              {orText}
            </Text>
            <View style={{ flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />
          </View>

          {/* Email button */}
          <AnimatedPressable
            onPress={handleToggleShowEmail}
            style={{
              backgroundColor: 'transparent',
              borderRadius: 14,
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)',
            }}
          >
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '600' }}>
              {signInEmailText}
            </Text>
          </AnimatedPressable>

          {showEmail ? (
            <View style={{ gap: 10, width: '100%' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', textAlign: 'center', marginBottom: 2 }}>
                {emailModeTitle}
              </Text>

              <View style={{ gap: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{emailLabelText}</Text>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder={emailLabelText}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 16, color: '#FFFFFF', textAlign: 'right' }}
                />
              </View>

              <View style={{ gap: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{passwordLabelText}</Text>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder={passwordLabelText}
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  secureTextEntry
                  style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 16, color: '#FFFFFF', textAlign: 'right' }}
                />
              </View>

              {emailMode === 'signup' && (
                <View style={{ gap: 4 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>{nameLabelText}</Text>
                  <TextInput
                    value={emailName}
                    onChangeText={setEmailName}
                    placeholder={nameLabelText}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    style={{ backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderRadius: 14, height: 52, paddingHorizontal: 16, color: '#FFFFFF', textAlign: 'right' }}
                  />
                </View>
              )}

              <LoadingButton
                title={continueText}
                loading={loadingEmail}
                disabled={emailSubmitDisabled}
                onPress={handleEmailSubmit}
                style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, height: 54, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginTop: 2 }}
                textStyle={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}
                loadingColor="#FFFFFF"
              />

              <AnimatedPressable onPress={handleToggleEmailMode} style={{ alignItems: 'center', paddingVertical: 4 }}>
                <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
                  {toggleModeText}
                </Text>
              </AnimatedPressable>
            </View>
          ) : null}

          <Text style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: 12, marginTop: 8 }}>
            {termsText}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}