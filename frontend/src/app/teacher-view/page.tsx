import React from "react";

export default function TeacherViewPage() {
  return (
    <div className="flex flex-col gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1>Review queue</h1>
          <p className="meta mt-2 text-base">
            Supervising teacher · Review pending reports and student progress
          </p>
        </div>
      </header>

      <div className="card">
        <h2 className="text-base font-semibold text-ink">Pending reports</h2>
        <p className="meta mt-1 text-sm">
          Review queue implementation in progress. Currently active in Teacher mode.
        </p>
      </div>
    </div>
  );
}
