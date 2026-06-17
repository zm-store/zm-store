import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useRef } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import {
  signInEmail,
  signUpEmail,
  exchangeGoogleSession,
  logoutSession,
  setBearerToken,
  clearAuthTokens,
  getBearerToken,
  API_URL,
  AuthUser,
} from "@/lib/auth";
import { apiGet } from "@/utils/api";

const ADMIN_EMAILS = ["srtda6@gmail.com"];
const EMERGENT_AUTH_URL = "https://auth.emergentagent.com/";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string, name?: string) => Promise<void>;
  signInWithApple: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  fetchUser: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getRedirectUrl(): string {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") return window.location.origin + "/";
    return API_URL + "/";
  }
  return Linking.createURL("auth-callback");
}

function extractSessionId(url: string): string | null {
  if (!url) return null;
  // hash fragment
  const hashIdx = url.indexOf("#");
  if (hashIdx >= 0) {
    const hashStr = url.substring(hashIdx + 1);
    const params = new URLSearchParams(hashStr);
    const sid = params.get("session_id");
    if (sid) return sid;
  }
  // query string
  const queryIdx = url.indexOf("?");
  if (queryIdx >= 0) {
    const params = new URLSearchParams(url.substring(queryIdx + 1));
    const sid = params.get("session_id");
    if (sid) return sid;
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const processedSessionIds = useRef<Set<string>>(new Set());

  const loadMe = useCallback(async (): Promise<AuthUser | null> => {
    const token = await getBearerToken();
    if (!token) return null;
    try {
      const me = await apiGet<AuthUser>("/api/me");
      const baseAdmin =
        (me?.is_admin === true) || ADMIN_EMAILS.includes((me?.email ?? "").toLowerCase());
      return { ...me, is_admin: baseAdmin };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn("[Auth] /api/me failed:", msg);
      if (msg.includes("401")) {
        await clearAuthTokens();
      }
      return null;
    }
  }, []);

  const fetchUser = useCallback(async () => {
    setLoading(true);
    try {
      const u = await loadMe();
      setUser(u);
    } finally {
      setLoading(false);
    }
  }, [loadMe]);

  const processGoogleSessionId = useCallback(
    async (session_id: string) => {
      if (processedSessionIds.current.has(session_id)) return;
      processedSessionIds.current.add(session_id);
      console.log("[Auth] Exchanging Google session_id");
      try {
        await exchangeGoogleSession(session_id);
        await fetchUser();
      } catch (e) {
        console.error("[Auth] Google exchange failed:", e);
      }
    },
    [fetchUser],
  );

  useEffect(() => {
    // On web, handle session_id from URL fragment/query (Emergent OAuth redirect)
    if (Platform.OS === "web" && typeof window !== "undefined") {
      const sid = extractSessionId(window.location.href);
      if (sid) {
        processGoogleSessionId(sid).then(() => {
          try {
            window.history.replaceState(null, "", window.location.pathname);
          } catch {}
        });
        return;
      }
    }
    fetchUser();

    // Listen for deep links on mobile (e.g., when returning from Google auth)
    const sub = Linking.addEventListener("url", async (evt) => {
      console.log("[Auth] Deep link:", evt.url);
      const sid = extractSessionId(evt.url);
      if (sid) await processGoogleSessionId(sid);
      else await fetchUser();
    });

    // Cold start: check initial URL on mobile
    if (Platform.OS !== "web") {
      Linking.getInitialURL().then(async (u) => {
        if (u) {
          const sid = extractSessionId(u);
          if (sid) await processGoogleSessionId(sid);
        }
      });
    }
    return () => sub.remove();
  }, [fetchUser, processGoogleSessionId]);

  const signInWithEmail = async (email: string, password: string) => {
    await signInEmail(email, password);
    await fetchUser();
  };

  const signUpWithEmail = async (email: string, password: string, name?: string) => {
    await signUpEmail(email, password, name);
    await fetchUser();
  };

  const signInWithGoogle = async () => {
    const redirectUrl = getRedirectUrl();
    const authUrl = `${EMERGENT_AUTH_URL}?redirect=${encodeURIComponent(redirectUrl)}`;
    console.log("[Auth] Opening Google auth:", authUrl);

    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.location.href = authUrl;
      }
      return;
    }

    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
    console.log("[Auth] Browser result:", result.type);
    if (result.type === "success" && (result as any).url) {
      const sid = extractSessionId((result as any).url);
      if (sid) await processGoogleSessionId(sid);
      else throw new Error("هیچ session_id لە URL ـی گەڕانەوە نییە");
    } else if (result.type === "cancel" || result.type === "dismiss") {
      throw new Error("Authentication cancelled");
    } else {
      throw new Error("Google sign-in failed");
    }
  };

  const signInWithApple = async () => {
    if (Platform.OS !== "ios") {
      throw new Error("Apple sign-in is only supported on iOS");
    }
    const AppleAuthentication = await import("expo-apple-authentication");
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });
    if (!credential.identityToken) throw new Error("No Apple identity token");
    // For simplicity, fall back to email-based registration using Apple email if present.
    if (credential.email) {
      try {
        await signInEmail(credential.email, credential.identityToken.substring(0, 24));
      } catch {
        await signUpEmail(
          credential.email,
          credential.identityToken.substring(0, 24),
          (credential.fullName?.givenName ?? "Apple User"),
        );
      }
      await fetchUser();
    } else {
      throw new Error("Apple sign-in did not return email. Please use Google or Email.");
    }
  };

  const signOut = async () => {
    await logoutSession();
    setUser(null);
  };

  const refresh = fetchUser;

  const isAdmin =
    (user?.is_admin ?? false) || ADMIN_EMAILS.includes((user?.email ?? "").toLowerCase());

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        signInWithEmail,
        signUpWithEmail,
        signInWithApple,
        signInWithGoogle,
        signOut,
        fetchUser,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Ensure WebBrowser sessions complete on cold start
WebBrowser.maybeCompleteAuthSession();
