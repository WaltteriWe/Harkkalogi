# Design Documents Sitemap

| Design Document | Date | Author | Components | Description |
| :--- | :--- | :--- | :--- | :--- |
| [Server-Only Persistence for Internship Submissions](./server-only-submission-persistence.md) | 2026-11-20 | Juho Simpanen | Frontend (`useAutoSave`, `PlanContext`, `ReportContext`, `guidance-evaluation`, `AuthContext`) | Approved architectural migration eliminating browser storage (`sessionStorage` and `localStorage`) for student submission drafts in favor of server-only persistence with lazy upsert-on-first-edit, in-memory flush on internship switch, 2000 ms debounce, 3-retry backoff, and removal of `LogoutWarningModal`. |
| [Internship Plan Form Compliance and Schema Alignment](./internship-plan-form-compliance.md) | 2026-11-23 | Juho Simpanen | Fullstack (`planning/page.tsx`, `PlanContext`, `schema.prisma`, `plans.schemas.ts`, `plans.service.ts`) | Architectural design aligning the internship plan form with institutional requirements: adds structured employer details, internship modality/compensation attributes, automated duration & credit calculation, and conditional supervisor validation for unpaid placements. |
