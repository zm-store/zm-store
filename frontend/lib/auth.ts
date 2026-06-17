/**
 * Auth client for Zm Store.
 * Replaces the legacy better-auth client. Talks to our FastAPI backend at
 * `EXPO_PUBLIC_BACKEND_URL` and stores a Bearer session_token in
 * expo-secure-store (mobile) or localStorage (web).
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

export const BEARER_TOKEN_KEY = "zmstore_bearer_token";

const FALLBACK_API = "https://mobile-dev-stage-117.preview.emergentagent.com";
export const API_URL: string = process.env.EXPO_PUBLIC_BACKEND_URL || FALLBACK_API;

// ─── token storage ────────────────────────────────────────────────────────
export async function setBearerToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function getBearerToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") {
      if (typeof localStorage === "undefined") return null;
      return localStorage.getItem(BEARER_TOKEN_KEY);
    }
    return await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function clearAuthTokens(): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

// ─── HTTP helpers ─────────────────────────────────────────────────────────
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getBearerToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error: ${res.status} - ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// ─── public auth API ──────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  image?: string | null;
  is_admin?: boolean;
  last_phone?: string | null;
  last_address?: string | null;
  points_balance?: number;
}

interface AuthResult {
  token: string;
  user: AuthUser;
}

export async function signUpEmail(email: string, password: string, name?: string): Promise<AuthResult> {
  const data = await request<AuthResult>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name: name ?? "" }),
  });
  if (data?.token) await setBearerToken(data.token);
  return data;
}

export async function signInEmail(email: string, password: string): Promise<AuthResult> {
  const data = await request<AuthResult>("/api/auth/signin", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (data?.token) await setBearerToken(data.token);
  return data;
}

export async function exchangeGoogleSession(session_id: string): Promise<AuthResult> {
  const data = await request<AuthResult>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ session_id }),
  });
  if (data?.token) await setBearerToken(data.token);
  return data;
}

export async function logoutSession(): Promise<void> {
  try {
    await request<void>("/api/auth/logout", { method: "POST" });
  } catch {
    // ignore
  }
  await clearAuthTokens();
}

// Compatibility shim — old code referenced authClient.getSession()/signIn etc.
export const authClient = {
  async getSession() {
    const token = await getBearerToken();
    if (!token) return { data: null };
    try {
      const me = await request<AuthUser>("/api/me");
      return { data: { session: { token }, user: me } };
    } catch {
      return { data: null };
    }
  },
  signIn: {
    email: ({ email, password }: { email: string; password: string }) => signInEmail(email, password),
    social: async () => ({ error: { message: "Use exchangeGoogleSession instead" } }),
  },
  signUp: {
    email: ({ email, password, name }: { email: string; password: string; name?: string }) =>
      signUpEmail(email, password, name),
  },
  signOut: () => logoutSession(),
};
