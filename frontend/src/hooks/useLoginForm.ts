import { useState, useCallback } from "react";
import { useAuth, SEED_USERS, UserPreset } from "@/context/AuthContext";
import { Role } from "@/components/sidebar";
import { ApiError } from "@/lib/api";

export interface UseLoginFormReturn {
  email: string;
  setEmail: (email: string) => void;
  password: string;
  setPassword: (password: string) => void;
  isSubmitting: boolean;
  errorMessage: string | null;
  presets: UserPreset[];
  currentUser: ReturnType<typeof useAuth>["user"];
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  handleSelectPreset: (presetEmail: string) => void;
  handleQuickLogin: (role: Role) => Promise<void>;
  clearError: () => void;
}

export function useLoginForm(): UseLoginFormReturn {
  const { login, quickLogin, user: currentUser } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;

      setIsSubmitting(true);
      setErrorMessage(null);

      try {
        await login(email, password);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Failed to sign in. Please verify your credentials.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [email, password, login]
  );

  const handleSelectPreset = useCallback((presetEmail: string) => {
    const matched = SEED_USERS.find((u) => u.email === presetEmail);
    setEmail(presetEmail);
    setPassword(matched?.defaultPassword || "password123");
    setErrorMessage(null);
  }, []);

  const handleQuickLogin = useCallback(
    async (role: Role) => {
      setIsSubmitting(true);
      setErrorMessage(null);
      try {
        await quickLogin(role);
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          setErrorMessage(err.message);
        } else if (err instanceof Error) {
          setErrorMessage(err.message);
        } else {
          setErrorMessage("Failed to quick login.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [quickLogin]
  );

  return {
    email,
    setEmail,
    password,
    setPassword,
    isSubmitting,
    errorMessage,
    presets: SEED_USERS,
    currentUser,
    handleSubmit,
    handleSelectPreset,
    handleQuickLogin,
    clearError,
  };
}

export default useLoginForm;

