"use client";

import React, { useEffect } from "react";

export interface LogoutWarningModalProps {
  isOpen: boolean;
  onStayLoggedIn: () => void;
  onConfirmLogout: () => void;
}

export function LogoutWarningModal({
  isOpen,
  onStayLoggedIn,
  onConfirmLogout,
}: LogoutWarningModalProps) {
  // Safe default: pressing Escape cancels logout and keeps the user in the app
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onStayLoggedIn();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onStayLoggedIn]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs"
      role="presentation"
    >
      <div
        className="card w-full max-w-md p-6 shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="logout-warning-title"
        aria-describedby="logout-warning-desc"
      >
        <div className="flex items-start gap-3.5">
          <div
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger-soft text-danger text-lg"
            aria-hidden="true"
          >
            ⚠️
          </div>
          <div className="flex-1">
            <h2 id="logout-warning-title" className="text-base font-bold text-ink sm:text-lg">
              Data will be lost if logged out
            </h2>
            <p className="text-xs text-ink-muted mt-0.5">
              Tallentamattomat tiedot menetetään uloskirjautuessa
            </p>
          </div>
        </div>

        <div id="logout-warning-desc" className="text-sm text-ink-muted leading-relaxed space-y-2">
          <p>
            We could not save your latest draft changes to the server because you appear to be offline
            or the server connection failed.
          </p>
          <p className="text-xs text-ink-muted/90">
            Tallentamattomia tietoja ei saatu tallennettua palvelimelle. Jos kirjaudut ulos nyt,
            muutokset poistetaan pysyvästi tältä laitteelta.
          </p>
        </div>

        <div className="mt-2 flex flex-col sm:flex-row-reverse gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onStayLoggedIn}
            className="button-primary text-sm font-semibold px-4 py-2"
            autoFocus
          >
            Stay logged in / Pysy kirjautuneena
          </button>
          <button
            type="button"
            onClick={onConfirmLogout}
            className="button-danger text-sm px-4 py-2"
          >
            Log out anyway / Kirjaudu silti ulos
          </button>
        </div>
      </div>
    </div>
  );
}

export default LogoutWarningModal;
