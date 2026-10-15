"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type Role = "student" | "teacher" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  title: string;
  passwordChangeRequired: boolean;
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<User>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${backendUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });
  } catch {
    throw new Error("Could not reach the Harkkalogi server. Please try again later.");
  }

  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      body && typeof body === "object" && "error" in body &&
      typeof body.error === "string"
        ? body.error
        : "The request could not be completed.";
    throw new Error(message);
  }
  return body as T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void request<{ user: User }>("/api/auth/me")
      .then(({ user: currentUser }) => {
        if (active) setUser(currentUser);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function login(email: string, password: string) {
    const { user: authenticatedUser } = await request<{ user: User }>(
      "/api/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      }
    );
    setUser(authenticatedUser);
    router.push(
      authenticatedUser.passwordChangeRequired
        ? "/profile"
        : authenticatedUser.role === "admin"
          ? "/admin"
          : authenticatedUser.role === "teacher"
            ? "/teacher-view"
            : "/"
    );
  }

  async function logout() {
    try {
      await request<{ success: boolean }>("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      router.push("/login");
    }
  }

  async function changePassword(currentPassword: string, newPassword: string) {
    const { user: updatedUser } = await request<{ user: User }>(
      "/api/auth/change-password",
      {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      }
    );
    setUser(updatedUser);
    return updatedUser;
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, changePassword }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
