import React from "react";

export default function AdminPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1>Administration</h1>
          <p className="meta mt-2 text-base">
            System administration · User roles, programmes, and settings
          </p>
        </div>
      </header>

      <div className="card">
        <h2 className="text-base font-semibold text-ink">Admin overview</h2>
        <p className="meta mt-1 text-sm">
          Administration panel in progress. Currently active in Admin mode.
        </p>
      </div>
    </div>
  );
}
