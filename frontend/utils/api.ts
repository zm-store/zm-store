/**
 * API helpers for the Zm Store backend. Talks to the FastAPI service at
 * `EXPO_PUBLIC_BACKEND_URL`. All endpoints expect a Bearer token; if a 401
 * occurs, the local token is cleared so the AuthContext can react.
 */
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { BEARER_TOKEN_KEY, clearAuthTokens, API_URL } from "@/lib/auth";

export const BACKEND_URL = API_URL;

export const isBackendConfigured = (): boolean => !!BACKEND_URL;

export const getBearerToken = async (): Promise<string | null> => {
  try {
    return Platform.OS === "web"
      ? (typeof localStorage !== "undefined" ? localStorage.getItem(BEARER_TOKEN_KEY) : null)
      : await SecureStore.getItemAsync(BEARER_TOKEN_KEY);
  } catch (error) {
    console.error("[API] getBearerToken error:", error);
    return null;
  }
};

async function executeRequest<T = any>(url: string, options: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 401) {
      await clearAuthTokens();
    }
    throw new Error(`API error: ${res.status} - ${text}`);
  }
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

export const apiCall = async <T = any>(endpoint: string, options?: RequestInit): Promise<T> => {
  if (!isBackendConfigured()) throw new Error("Backend URL not configured");
  const url = `${BACKEND_URL}${endpoint}`;
  const fetchOptions: RequestInit = {
    ...options,
    headers: { "Content-Type": "application/json", ...(options?.headers as any) },
  };
  const token = await getBearerToken();
  if (token) {
    fetchOptions.headers = { ...(fetchOptions.headers as any), Authorization: `Bearer ${token}` };
  }
  return executeRequest<T>(url, fetchOptions);
};

export const apiGet = <T = any>(p: string) => apiCall<T>(p, { method: "GET" });
export const apiPost = <T = any>(p: string, d: any) => apiCall<T>(p, { method: "POST", body: JSON.stringify(d) });
export const apiPut = <T = any>(p: string, d: any) => apiCall<T>(p, { method: "PUT", body: JSON.stringify(d) });
export const apiPatch = <T = any>(p: string, d: any) => apiCall<T>(p, { method: "PATCH", body: JSON.stringify(d) });
export const apiDelete = <T = any>(p: string, d: any = {}) =>
  apiCall<T>(p, { method: "DELETE", body: JSON.stringify(d) });

// Aliases — older code distinguished "authenticated" vs anonymous endpoints,
// but our new client always sends the Bearer header when a token is stored.
export const authenticatedApiCall = apiCall;
export const authenticatedGet = apiGet;
export const authenticatedPost = apiPost;
export const authenticatedPut = apiPut;
export const authenticatedPatch = apiPatch;
export const authenticatedDelete = apiDelete;
