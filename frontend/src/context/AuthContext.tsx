"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { Role } from "@/components/sidebar";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  title: string;
  department?: string;
  landingPath: string;
}

export const MOCK_USERS: Record<Role, User> = {
  student: {
    id: 1,
    name: "Aino Korhonen",
    email: "aino.korhonen@metropolia.fi",
    role: "student",
    title: "Software Engineering Student",
    department: "Information Technology",
    landingPath: "/",
  },
  teacher: {
    id: 2,
    name: "Mikko Laine",
    email: "mikko.laine@metropolia.fi",
    role: "teacher",
    title: "Supervising Teacher",
    department: "School of ICT",
    landingPath: "/teacher-view",
  },
  admin: {
    id: 3,
    name: "Admin User",
    email: "admin@metropolia.fi",
    role: "admin",
    title: "System Administrator",
    department: "Academic Administration",
    landingPath: "/admin",
  },
};

export const MOCK_USER_LIST: User[] = Object.values(MOCK_USERS);

const TOKEN_STORAGE_KEY = "harkkalogi_auth_token";
const USER_STORAGE_KEY = "harkkalogi_auth_user";

interface AuthStoreState {
  user: User | null;
  token: string | null;
}

const DEFAULT_AUTH_STORE: AuthStoreState = {
  user: MOCK_USERS.student,
  token: "mock-token-student-default",
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
        };
      } else {
        window.localStorage.setItem(
          USER_STORAGE_KEY,
          JSON.stringify(DEFAULT_AUTH_STORE.user)
        );
        window.localStorage.setItem(
          TOKEN_STORAGE_KEY,
          DEFAULT_AUTH_STORE.token || ""
        );
        currentStore = DEFAULT_AUTH_STORE;
      }
    } catch {
      currentStore = DEFAULT_AUTH_STORE;
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
          };
        } else {
          currentStore = { user: null, token: null };
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
  login: (email: string, password?: string) => Promise<boolean>;
  quickLogin: (role: Role) => void;
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

  const login = useCallback(
    async (email: string): Promise<boolean> => {
      const trimmedEmail = email.trim().toLowerCase();

      const matchedUser = MOCK_USER_LIST.find(
        (u) => u.email.toLowerCase() === trimmedEmail
      );

      let targetUser: User;
      if (matchedUser) {
        targetUser = matchedUser;
      } else if (trimmedEmail.includes("teacher")) {
        targetUser = {
          ...MOCK_USERS.teacher,
          email: trimmedEmail,
          name: trimmedEmail.split("@")[0].replace(".", " "),
        };
      } else if (trimmedEmail.includes("admin")) {
        targetUser = {
          ...MOCK_USERS.admin,
          email: trimmedEmail,
          name: trimmedEmail.split("@")[0].replace(".", " "),
        };
      } else {
        targetUser = {
          ...MOCK_USERS.student,
          email: trimmedEmail,
          name: trimmedEmail.split("@")[0].replace(".", " ") || "New Student",
        };
      }

      const generatedToken = `mock-token-${targetUser.role}-${Date.now()}`;
      setStore({
        user: targetUser,
        token: generatedToken,
      });

      router.push(targetUser.landingPath);
      return true;
    },
    [router]
  );

  const quickLogin = useCallback(
    (role: Role) => {
      const targetUser = MOCK_USERS[role];
      if (targetUser) {
        const generatedToken = `mock-token-${targetUser.role}-${Date.now()}`;
        setStore({
          user: targetUser,
          token: generatedToken,
        });
        router.push(targetUser.landingPath);
      }
    },
    [router]
  );

  const logout = useCallback(() => {
    setStore({ user: null, token: null });
    router.push("/login");
  }, [router]);

  const value = {
    user: store.user,
    token: store.token,
    isAuthenticated: Boolean(store.token && store.user),
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

