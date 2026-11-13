"use client";

import React, { useState } from "react";
import { apiFetch } from "@/lib/api";

export interface DemoAccount {
  name: string;
  email: string;
  badge: string;
  badgeColorClass: string;
  subtitle: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    name: "Sara Niemi",
    email: "sara.niemi@metropolia.fi",
    badge: "Uusi opiskelija · Vaihe 1",
    badgeColorClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    subtitle: "sara.niemi@metropolia.fi · Valvoja: Mikko Laine",
  },
  {
    name: "Aino Korhonen",
    email: "aino.korhonen@metropolia.fi",
    badge: "Käynnissä · Vaihe 3",
    badgeColorClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    subtitle: "aino.korhonen@metropolia.fi",
  },
  {
    name: "Mikko Laine",
    email: "mikko.laine@metropolia.fi",
    badge: "Valvojaopettaja",
    badgeColorClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    subtitle: "mikko.laine@metropolia.fi",
  },
];

export const DEMO_DEFAULT_PASSWORD = "password123";
export const DEMO_STORAGE_KEY_SARA = "harkkalogi_plan_sara";

/**
 * Checks whether demo features should be enabled.
 * - Always enabled in development / test environments.
 * - In production, disabled by default unless explicitly enabled via NEXT_PUBLIC_ENABLE_DEMO=true.
 */
export function isDemoEnabled(): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }
  return process.env.NEXT_PUBLIC_ENABLE_DEMO === "true";
}

interface DemoAccountsCardProps {
  onSelectAccount: (email: string, password: string) => void;
}

export function DemoAccountsCard({ onSelectAccount }: DemoAccountsCardProps) {
  // Automatically hide and exclude from production build
  if (!isDemoEnabled()) {
    return null;
  }

  const [isResetting, setIsResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState<string | null>(null);

  const handleResetDemo = async () => {
    setIsResetting(true);
    setResetNotice(null);
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DEMO_STORAGE_KEY_SARA);
        window.localStorage.removeItem("harkkalogi_reports_sara_niemi_metropolia_fi");
        window.localStorage.removeItem("harkkalogi_reports_sara");
        window.localStorage.removeItem("harkkalogi_report_store_v4");
      }
      await apiFetch("/demo/reset", { method: "POST" }).catch(() => {});
      onSelectAccount("sara.niemi@metropolia.fi", DEMO_DEFAULT_PASSWORD);
      setResetNotice("Saran testitila nollattu puhtaaksi (Vaihe 1). Tunnukset esitäytetty.");
    } catch {
      setResetNotice("Testitila nollattu selaimesta.");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="card shadow-sm mt-6 border border-border">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-ink-muted">
          Pikatestaus / Demo accounts
        </h2>
        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-muted text-ink-muted font-medium">
          Demo
        </span>
      </div>

      <p className="text-xs text-ink-muted mb-4 leading-relaxed">
        Valitse tili esitäyttääksesi tunnukset. Voit testata koko harjoitteluprosessia alusta uudella opiskelijalla (Sara) tai tarkastella opettajan näkymää (Mikko).
      </p>

      <div className="flex flex-col gap-2">
        {DEMO_ACCOUNTS.map((account) => (
          <button
            key={account.email}
            type="button"
            onClick={() => onSelectAccount(account.email, DEMO_DEFAULT_PASSWORD)}
            className="text-left p-2.5 rounded-control border border-border hover:border-primary/50 hover:bg-surface-muted/50 transition-colors flex items-center justify-between"
          >
            <div>
              <div className="text-sm font-medium text-ink flex items-center gap-1.5">
                <span>{account.name}</span>
                <span className={`text-[11px] px-1.5 py-0.5 rounded font-normal ${account.badgeColorClass}`}>
                  {account.badge}
                </span>
              </div>
              <div className="text-xs text-ink-muted">{account.subtitle}</div>
            </div>
            <span className="text-xs font-semibold text-primary">Käytä &rarr;</span>
          </button>
        ))}
      </div>

      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
        <span className="text-xs text-ink-muted">Testattuasi voit nollata tilanteen:</span>
        <button
          type="button"
          onClick={handleResetDemo}
          disabled={isResetting}
          className="text-xs font-medium text-amber-700 dark:text-amber-400 hover:underline flex items-center gap-1"
        >
          <span>↺</span>
          <span>{isResetting ? "Nollataan..." : "Nollaa Saran testitila"}</span>
        </button>
      </div>

      {resetNotice && (
        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 p-2 rounded-control">
          {resetNotice}
        </div>
      )}
    </div>
  );
}

export default DemoAccountsCard;
