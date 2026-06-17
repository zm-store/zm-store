import { Linking } from 'react-native';

export const STORE_WHATSAPP = '9647507131541';

export async function openWhatsApp(phone: string, message?: string): Promise<void> {
  const digits = phone.replace(/\D/g, '');
  const encodedMessage = message ? encodeURIComponent(message) : '';
  const url = encodedMessage
    ? `https://wa.me/${digits}?text=${encodedMessage}`
    : `https://wa.me/${digits}`;

  console.log(`[WhatsApp] Opening chat with ${digits}`);

  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  } else {
    await Linking.openURL(url);
  }
}
