"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import {
  type Role,
  isRouteAllowedForRole,
  getLandingPath,
} from "@/lib/auth-routes";
import {
  apiFetch,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from "@/lib/api";
import {
  setAuthCookie,
  clearAuthCookie,
  sanitizeRedirectPath,
} from "@/lib/auth-cookie";

export { isRouteAllowedForRole, type Role };

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  studyType?: "DAYTIME" | "MULTIFORM" | null;
  title?: string;
  department?: string;
  landingPath: string;
}

export interface UserPreset {
  id: number;
  name: string;
  email: string;
  role: Role;
  defaultPassword?: string;
}

export const SEED_USERS: UserPreset[] = [
  {
    id: 1,
    name: "Aino Korhonen",
    email: "aino.korhonen@metropolia.fi",
    role: "student",
    defaultPassword: "password123",
  },
  {
    id: 2,
    name: "Mikko Laine",
    email: "mikko.laine@metropolia.fi",
    role: "teacher",
    defaultPassword: "password123",
  },
  {
    id: 3,
    name: "Admin User",
    email: "admin@metropolia.fi",
    role: "admin",
    defaultPassword: "password123",
  },
];

// Retain alias for any components relying on preset listings
export const MOCK_USER_LIST = SEED_USERS;

interface AuthStoreState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
}

const DEFAULT_AUTH_STORE: AuthStoreState = {
  user: null,
  token: null,
  isLoading: true,
};

let currentStore: AuthStoreState = DEFAULT_AUTH_STORE;
let isLoadedFromStorage = false;
const listeners: Array<() => void> = [];

function loadFromStorage(): AuthStoreState {
  if (isLoadedFromStorage) return currentStore;
  if (typeof window !== "undefined") {
    try {
      const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
      const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);

      if (storedToken && storedUser) {
        currentStore = {
          user: JSON.parse(storedUser),
          token: storedToken,
          isLoading: false,
        };
      } else {
        currentStore = {
          user: null,
          token: null,
          isLoading: false,
        };
      }
    } catch {
      currentStore = {
        user: null,
        token: null,
        isLoading: false,
      };
    }
    isLoadedFromStorage = true;
  }
  return currentStore;
}

function notify() {
  for (const listener of listeners) {
    listener();
  }
}

function setStore(next: AuthStoreState) {
  currentStore = next;
  if (typeof window !== "undefined") {
    try {
      if (next.user && next.token) {
        window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(next.user));
        window.localStorage.setItem(TOKEN_STORAGE_KEY, next.token);
      } else {
        window.localStorage.removeItem(USER_STORAGE_KEY);
        window.localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch {
      // Ignore
    }
  }
  notify();
}

function subscribe(listener: () => void) {
  listeners.push(listener);
  const handleStorageEvent = (event: StorageEvent) => {
    if (
      (event.key === USER_STORAGE_KEY || event.key === TOKEN_STORAGE_KEY) &&
      typeof window !== "undefined"
    ) {
      try {
        const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        const storedUser = window.localStorage.getItem(USER_STORAGE_KEY);
        if (storedToken && storedUser) {
          currentStore = {
            user: JSON.parse(storedUser),
            token: storedToken,
            isLoading: false,
          };
        } else {
          currentStore = { user: null, token: null, isLoading: false };
        }
        notify();
      } catch {
        // Ignore
      }
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("storage", handleStorageEvent);
  }

  return () => {
    const idx = listeners.indexOf(listener);
    if (idx !== -1) listeners.splice(idx, 1);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", handleStorageEvent);
    }
  };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<boolean>;
  quickLogin: (role: Role) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();

  const store = useSyncExternalStore(
    subscribe,
    () => loadFromStorage(),
    () => DEFAULT_AUTH_STORE
  );

  // Validate session against backend /api/auth/me on mount if token exists
  useEffect(() => {
    if (!store.token) return;

    let isMounted = true;
    apiFetch<{ user: User }>("/auth/me")
      .then((data) => {
        if (isMounted && data.user) {
          setStore({
            user: data.user,
            token: store.token,
            isLoading: false,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          // Stored token is invalid or expired
          clearAuthCookie();
          setStore({ user: null, token: null, isLoading: false });
          router.push("/login");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [store.token, router]);

  const login = useCallback(
    async (email: string, password = "password123"): Promise<boolean> => {
      const trimmedEmail = email.trim().toLowerCase();

      const res = await apiFetch<{ token: string; user: User }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: trimmedEmail, password }),
      });

      setAuthCookie(res.token);
      setStore({
        user: res.user,
        token: res.token,
        isLoading: false,
      });

      // Check if there was a return URL in the query params
      let destination = res.user.landingPath || getLandingPath(res.user.role);
      if (typeof window !== "undefined") {
        const params = new URLSearchParams(window.location.search);
        const fromParam = sanitizeRedirectPath(params.get("from"));
        if (fromParam && isRouteAllowedForRole(res.user.role, fromParam)) {
          destination = fromParam;
        }
      }

      router.push(destination);
      return true;
    },
    [router]
  );

  const quickLogin = useCallback(
    async (role: Role): Promise<boolean> => {
      const targetUser = SEED_USERS.find((u) => u.role === role);
      if (targetUser) {
        return login(targetUser.email, targetUser.defaultPassword || "password123");
      }
      return false;
    },
    [login]
  );

  const logout = useCallback(() => {
    // Fire-and-forget backend logout
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    clearAuthCookie();
    setStore({ user: null, token: null, isLoading: false });
    router.push("/login");
  }, [router]);

  const value = {
    user: store.user,
    token: store.token,
    isAuthenticated: Boolean(store.token && store.user),
    isLoading: store.isLoading,
    login,
    quickLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
