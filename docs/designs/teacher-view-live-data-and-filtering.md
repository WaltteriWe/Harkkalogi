# Teacher View Live Data, Navigation, and Filtering

*   **Author**: Juho Simpanen
*   **Status**: Proposed
*   **Date**: 2026-11-25

--------------------------------------------------------------------------------

## Overview

The teacher-facing pages in Harkkalogi (`Review queue` at `/teacher-view` and `My students` at `/teacher-view/students`) currently display hardcoded mock arrays (`INITIAL_QUEUE_ITEMS` and `SUPERVISED_STUDENTS`). Because they do not read from or write to the backend API, teachers cannot see real student internships, submitted reports, or persistent OMA (Metropolia's student and credit registry) credit states.

This design replaces the hardcoded teacher-view data with live backend API integration, removes the standalone `Guidance evaluation` (the post-report reflection and supervision quality form at `/guidance-evaluation`) link from the teacher sidebar so evaluations are opened in context from student and review pages, introduces an expandable multi-filter bar (study type and status) on `My students`, and centers the action controls in the `My students` table.

## The Problem

1. **Disconnected Teacher UI**: Teachers see static mock students and reports instead of real database records from PostgreSQL via `/api/internships` and `/api/reports`. Any review action or OMA credit toggle only updates local React state and disappears on page reload.
2. **Uncontextual Sidebar Navigation**: Having `Guidance evaluation` as a top-level item in the teacher sidebar (`navByRole.teacher`) opens the evaluation view without a selected `internshipId`. Teachers should reach a student's guidance evaluation from the `My students` or `Review queue` rows instead.
3. **Limited Student Filtering**: `My students` currently uses a single flat pill state (`filterMode: "all" | "päivätoteutus" | "monimuoto" | "needs_review"`). Teachers cannot combine study type (`Päivätoteutus` [daytime study] / `Monimuoto` [multiform study] / `All`) with internship or report status filters, and adding more pills directly to a single row does not scale.
4. **Misaligned Row Actions**: The `Actions` column in `My students` is right-aligned, which separates the action buttons visually from the rest of the row content.

## Goals

*   **Live Backend Data**: Populate `Review queue` (`/teacher-view`) and `My students` (`/teacher-view/students`) from backend APIs, including loading and error states, and persist teacher actions (OMA credit toggles and report review decisions).
*   **Contextual Guidance Evaluation Access**: Remove `Guidance evaluation` from the teacher sidebar (`navByRole.teacher`) and ensure teachers can open guidance evaluation directly from `My students` and `Review queue` rows whenever an `internshipId` is present.
*   **Expandable Multi-Filter Bar**: Replace the single `filterMode` pill row on `My students` with a selectable filter bar that expands to show filter options/pills for both study type (`All`, `Monimuoto`, `Päivätoteutus`) and status, combining active filters.
*   **Centered Actions Column**: Center-align the `Actions` header and action buttons in the `My students` table.

## Non-Goals

*   Redesigning the student-facing sidebar, `/guidance-evaluation` form fields, or admin pages.
*   Building new authentication or role-permission models beyond the existing `TEACHER` / `ADMIN` role checks.
*   Adding pagination, server-side full-text search, or bulk actions.

--------------------------------------------------------------------------------

## Critical User Journeys (CUJs)

### CUJ 1: Teacher Reviews a Submitted Report and Updates OMA Credits

*   **Given**: A teacher is signed in and navigates to `/teacher-view` (`Review queue`), and at least one supervised student has submitted an internship report (`Report.status === "SUBMITTED"`).
*   **When**: The teacher opens the report from the queue, enters feedback, optionally checks `Credits put to OMA`, and clicks `Approve report` (or `Request changes`).
*   **Then**: The backend atomically persists a `Review` record (`APPROVED` or `NEEDS_CHANGES`), updates `Report.status` and `Internship.stage` via `syncWorkflowState` (the backend function that recomputes `Internship.stage` from plan, report, evaluation, and OMA state), and (when approved with `creditsPutToOma` provided) updates `creditsPutToOma` in the same transaction. Reloading `/teacher-view` reflects the updated status and OMA state.

### CUJ 2: Teacher Filters Supervised Students by Study Type and Status

*   **Given**: A teacher navigates to `/teacher-view/students` (`My students`), which has loaded that teacher's supervised internships from `GET /api/internships`.
*   **When**: The teacher clicks the filter bar toggle to expand filter options, selects `Monimuoto` under study type and `Needs review` under status, and optionally types a search query.
*   **Then**: The table displays only students matching all active criteria (study type AND status AND search query), shows active filter summary chips on the bar, and allows resetting filters.

### CUJ 3: Teacher Opens Guidance Evaluation from Student or Review Context

*   **Given**: A teacher is viewing the sidebar (which no longer contains a `Guidance evaluation` link) and is on `/teacher-view/students` or `/teacher-view`.
*   **When**: The teacher clicks `Evaluation` in the centered `Actions` column on `My students` (or in the `Actions` column on `Review queue`).
*   **Then**: The browser navigates to `/guidance-evaluation?internshipId=<id>`, loading that student's guidance evaluation from `GET /api/internships/:id/guidance-evaluation` in read-only mode (or an empty/locked notice if not yet submitted).

--------------------------------------------------------------------------------

## Technical Plan (Architecture)

### 1. Backend Data Fetching, Supervision Scoping & Review Persistence

*   **Teacher Supervision Scoping**:
    *   In `InternshipsController.list` (`GET /api/internships`) and `ReportsController.list` (`GET /api/reports`), automatically scope results to `teacherId = req.user.id` when `req.user.role === "TEACHER"` (while allowing `Role.ADMIN` to view all or filter via `?teacherId=`).
    *   Enforce `internship.teacherId === req.user.id || req.user.role === Role.ADMIN` on `POST /api/reports/:id/reviews`, `PATCH /api/internships/:id/credits`, `GET /api/internships/:id`, and `GET /api/internships/:id/guidance-evaluation` to prevent cross-teacher access.
*   **My Students (`/teacher-view/students`)**:
    *   Fetch live supervised internship records via `apiFetch("/internships")` (note: `apiFetch` in `frontend/src/lib/api.ts` prepends `API_BASE`, which already ends with `/api`, so paths omit `/api`).
    *   `InternshipsService.listInternships` already returns `student` (`id`, `name`, `email`, `studyType`), `reports`, `plan`, `guidanceEvaluation`, `creditsPutToOma`, `loggedHours`, `requiredHours`, and `workflow`. Include `reviews` (ordered by `createdAt: "desc"`) inside `reports` so `My students` can distinguish `changes_requested` from `in_progress`.
    *   Map `student.studyType` (`DAYTIME` -> `"päivätoteutus"`, `MULTIFORM` -> `"monimuoto"`, `null` -> `"unspecified"` included under `All`). Display `internship.title` alongside `student.name` so students with multiple internships are distinguishable, and guard `requiredHours > 0` in progress calculations.
    *   Persist inline OMA credit checkbox toggles via `apiFetch("/internships/${id}/credits", { method: "PATCH", ... })`, tracking `pendingOmaIds` per row to prevent concurrent toggle races and reconciling row state from the server response (with rollback and visible error notice on failure).
*   **Review Queue (`/teacher-view`)**:
    *   Use `apiFetch("/reports")` (`GET /api/reports`) as the single authoritative data source for `Review queue`.
    *   Extend `ReportsService.listReports` to include `internship.title`, `internship.credits`, `internship.creditsPutToOma`, `internship.requiredHours`, `internship.stage`, `internship.teacherId`, and `internship.student.studyType`, with `reviews` ordered by `createdAt: "desc"`. Exclude never-submitted `DRAFT` reports on the frontend (or via query filter) so only `SUBMITTED`, `REVIEWED`, and `DRAFT` reports whose latest review (`reviews[0]`) is `NEEDS_CHANGES` appear in the queue.
    *   Add a teacher-only review endpoint `POST /api/reports/:id/reviews` (guarded by `requireRole([Role.TEACHER, Role.ADMIN])` and validated by Zod) that runs inside `prisma.$transaction(async (tx) => ...)`:
        1. Verifies the report exists, its internship belongs to the teacher (or caller is `ADMIN`), and `report.status === ReportStatus.SUBMITTED` (returning `409 Conflict` otherwise).
        2. Creates a `Review` row (`decision: "APPROVED" | "NEEDS_CHANGES"`, `comment`, `teacherId`, `reportId`).
        3. Updates `Report.status` (`REVIEWED` on `APPROVED`, `DRAFT` on `NEEDS_CHANGES`) and `approvedAt` (`new Date()` on `APPROVED`, `null` on `NEEDS_CHANGES`).
        4. If `decision === "APPROVED"` and `creditsPutToOma` is provided, updates `Internship.creditsPutToOma` and `creditsPutToOmaAt` in the same transaction.
        5. Calls `syncWorkflowState(report.internshipId, tx)` so `Internship.stage` updates atomically.
    *   Fix `computeInternshipWorkflow` in `internship-workflow.service.ts` so `reportApproved` checks `(latestReport?.status || "").toUpperCase() === "REVIEWED"` (or `latestReport?.status !== "DRAFT" && latestReport?.reviews?.[0]?.decision === "APPROVED"`) rather than `.some(...)` over all historical reviews, and order `reviews` by `createdAt: "desc"` in `syncWorkflowState`.
    *   **Deterministic Status Derivation** (shared frontend helper for both views, inspecting `latestReport = reports[0]`):
        *   `latestReport.status === "REVIEWED"` -> `"approved"`
        *   `latestReport.status === "SUBMITTED"` -> `"needs_review"`
        *   `latestReport.status === "DRAFT"` and `latestReport.reviews?.[0]?.decision === "NEEDS_CHANGES"` -> `"changes_requested"`
        *   Otherwise -> `"in_progress"`

```text
[Teacher UI: /teacher-view]
   |-- apiFetch("/reports") ---------------------------> [ReportsController -> ReportsService.listReports]
   |-- apiFetch("/reports/:id/reviews", POST) ---------> [ReportsController -> prisma.$transaction(Review + Report + OMA + syncWorkflowState)]
   '-- apiFetch("/internships/:id/credits", PATCH) ----> [InternshipsController -> creditsPutToOma + syncWorkflowState]

[Teacher UI: /teacher-view/students]
   |-- apiFetch("/internships") -----------------------> [InternshipsController -> InternshipsService.listInternships]
   |-- apiFetch("/internships/:id/credits", PATCH) ----> [InternshipsController -> creditsPutToOma + syncWorkflowState]
   |-- Link: /teacher-view?internshipId=:id -----------> [ReviewQueuePage (auto-opens report)]
   '-- Link: /guidance-evaluation?internshipId=:id ----> [GuidanceEvaluationPage]
```

### 2. Sidebar Navigation Cleanup

*   In `frontend/src/components/sidebar.tsx`, remove `{ label: "Guidance evaluation", href: "/guidance-evaluation" }` from `navByRole.teacher`.
*   Keep `{ label: "Guidance evaluation", href: "/guidance-evaluation" }` in `navByRole.student` untouched.
*   Teachers access guidance evaluation through row `Actions` on `/teacher-view/students` (`Evaluation` link to `/guidance-evaluation?internshipId=<id>`) and row `Actions` on `/teacher-view` (`Evaluation` link to `/guidance-evaluation?internshipId=<id>`).

### 3. Expandable Multi-Filter Bar on My Students

*   Replace the single flat `filterMode` pill row in `frontend/src/app/teacher-view/students/page.tsx` with a two-part filter bar:
    1. **Selectable Filter Bar (Header/Toggle)**: A clickable bar showing `Filters`, summary chips of any active filters (e.g., `Study type: Monimuoto`, `Status: Needs review`), and a `Clear all` button when non-default filters are active. Clicking the bar toggles the expanded filter panel open or closed.
    2. **Expanded Filter Options**: When open, displays grouped pill rows:
        *   **Study type**: `All`, `Päivätoteutus`, `Monimuoto` (with total counts across the fetched list).
        *   **Status**: `All`, `In progress`, `Needs review`, `Changes requested`, `Approved` (with total counts across the fetched list).
*   Combine `studyTypeFilter`, `statusFilter`, and `searchQuery` with logical AND so teachers can narrow down, for example, all `Monimuoto` students whose reports `Needs review`.

### 4. Centered Actions Column on My Students

*   In `frontend/src/app/teacher-view/students/page.tsx`, center-align the `Actions` table header and the row action buttons (`Review` linking to `/teacher-view?internshipId=<id>`, `Evaluation` linking to `/guidance-evaluation?internshipId=<id>`, and `Message` linking to `/messages`).

--------------------------------------------------------------------------------

## Alternatives Considered

### Alternative A: Server-Side Query Filtering on My Students

*   **Pros**: Passing `studyType`, `status`, and `search` as query parameters to `GET /api/internships` would reduce payload size if a teacher supervised thousands of students.
*   **Cons**: Requires backend filter query parsing, extra API round-trips on every filter pill click or search keystroke, and separate aggregate queries to show per-option counts.
*   **Reason for Rejection**: Rejected by author: Teacher cohorts are small enough that client-side filtering over the fetched `GET /api/internships` list updates the table synchronously in memory without network round-trips or extra backend query complexity.

### Alternative B: Reusing `PATCH /api/reports/:id` for Teacher Reviews

*   **Pros**: Avoids adding a new route, schema, and controller method.
*   **Cons**: `PATCH /api/reports/:id` is designed for editing report content (`title`, `realizedHours`, `generalSummary`, `status`) and does not create a `Review` row (`teacherId`, `decision`, `comment`), which would drop teacher feedback history and mix student draft edits with teacher review actions.
*   **Reason for Rejection**: Rejected by author: A dedicated `POST /api/reports/:id/reviews` endpoint enforces `TEACHER` / `ADMIN` role authorization and records structured `Review` entries alongside `Report.status` and `Internship.stage` updates.

### Alternative C: Always-Visible Multi-Row Pill Bar

*   **Pros**: Shows every study type and status filter option immediately without an extra click.
*   **Cons**: Permanently stacking multiple pill rows above the table adds vertical clutter and crowds narrower viewports.
*   **Reason for Rejection**: Rejected by author: A selectable filter bar that expands on click avoids stacking multiple filter rows by default while exposing all filter options when needed.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Security & Authorization**:
    *   `POST /api/reports/:id/reviews` and `PATCH /api/internships/:id/credits` MUST be restricted to `Role.TEACHER` and `Role.ADMIN` via `requireRole([Role.TEACHER, Role.ADMIN])` and verify `internship.teacherId === req.user.id` for `Role.TEACHER`.
    *   `GET /api/internships` and `GET /api/reports` MUST scope results to `teacherId = req.user.id` for `Role.TEACHER`.
    *   `GET /api/internships/:id` and `GET /api/internships/:id/guidance-evaluation` MUST verify ownership (`studentId === req.user.id` for `STUDENT`, `teacherId === req.user.id` for `TEACHER`, unrestricted for `ADMIN`).
*   **Reliability & Error Handling**:
    *   Both `/teacher-view` and `/teacher-view/students` MUST handle loading states, empty states, and API errors visibly instead of silently falling back to mock data.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `backend/src/modules/reports/reports.schemas.ts` (Modify)

*   **Type / Scope**: Backend Validation Schema (Zod)
*   **Proposed Changes**: Add `createReviewSchema` validating `params.id` (numeric report ID) and `body` (`decision`: `z.enum(["APPROVED", "NEEDS_CHANGES"])`, `comment`: `z.string().trim().optional().default("")`, `creditsPutToOma`: `z.boolean().optional()`), with a `.refine()` rule rejecting empty `comment` with HTTP `400` when `decision === "NEEDS_CHANGES"`. Export `CreateReviewInput = z.infer<typeof createReviewSchema>["body"]`.

#### 2. `backend/src/modules/reports/reports.service.ts` (Modify)

*   **Type / Scope**: Backend Service
*   **Proposed Changes**:
    *   Update `listReports` to accept optional `teacherId` filter (`internship: { teacherId }`), include `internship.title`, `internship.credits`, `internship.creditsPutToOma`, `internship.requiredHours`, `internship.stage`, `internship.teacherId`, and `internship.student.studyType`, and order `reviews` by `createdAt: "desc"`.
    *   Add `createReview(reportId: number, input: CreateReviewInput, teacher: AuthUser)` wrapped in `prisma.$transaction`: verifies report exists (`404`), checks `teacher.role === "ADMIN" || report.internship.teacherId === teacher.id` (`403`), checks `report.status === ReportStatus.SUBMITTED` (`409`), creates `Review` (`comment: input.comment ?? ""`), updates `Report.status` (`REVIEWED` / `DRAFT`) and `approvedAt`, optionally updates `creditsPutToOma` on `Internship` when `decision === "APPROVED"`, and calls `syncWorkflowState(report.internshipId, tx)`. Returns `{ review, report }`.

#### 3. `backend/src/modules/reports/reports.controller.ts` & `backend/src/modules/reports/reports.routes.ts` (Modify)

*   **Type / Scope**: Backend Controller & Express Router
*   **Proposed Changes**:
    *   In `ReportsController.list`, auto-set `teacherId = user.id` when `user.role === "TEACHER"`.
    *   Add `ReportsController.createReview(req, res, next)` returning HTTP `201` with `{ review, report }`.
    *   Register `POST /:id/reviews` in `reports.routes.ts` guarded by `requireRole([Role.TEACHER, Role.ADMIN])` and `validate(createReviewSchema)`.

#### 4. `backend/src/modules/internships/internships.routes.ts`, `internships.controller.ts`, `internships.service.ts` & `internship-workflow.service.ts` (Modify)

*   **Type / Scope**: Backend Router, Controller, Service & Workflow
*   **Proposed Changes**:
    *   In `internships.routes.ts`, guard `PATCH /:id/credits` with `requireRole([Role.TEACHER, Role.ADMIN])` and Zod validation for `{ creditsPutToOma: z.boolean() }`.
    *   In `internships.controller.ts`, auto-scope `list` by `teacherId = user.id` when `user.role === "TEACHER"`, and enforce ownership (`ADMIN` or matching `studentId` / `teacherId`) in `getById`, `updateCredits`, and `getGuidanceEvaluation`.
    *   In `InternshipsService.listInternships`, include `reviews: { orderBy: { createdAt: "desc" } }` inside `reports`.
    *   In `internship-workflow.service.ts`, order `reviews` by `createdAt: "desc"` in `syncWorkflowState` and update `computeInternshipWorkflow` so `reportApproved` checks `latestReport?.status === "REVIEWED"` (or `latestReport?.status !== "DRAFT" && latestReport?.reviews?.[0]?.decision === "APPROVED"`) rather than `.some(...)`.

#### 5. `backend/src/modules/reports/__tests__/reports.test.ts` (Modify)

*   **Type / Scope**: Backend Integration Test
*   **Proposed Changes**: Add test cases covering `POST /api/reports/:id/reviews` for `TEACHER` approval (`APPROVED` -> `REVIEWED` + optional `creditsPutToOma`), `TEACHER` revision request (`NEEDS_CHANGES` -> `DRAFT`, `400` on empty comment), `409` on non-`SUBMITTED` report, `403` for `STUDENT` or non-assigned `TEACHER`, and `GET /api/reports` teacher scoping.

#### 6. `frontend/src/components/sidebar.tsx` (Modify)

*   **Type / Scope**: Shared Navigation Component
*   **Proposed Changes**: Remove `{ label: "Guidance evaluation", href: "/guidance-evaluation" }` from `navByRole.teacher` while keeping `Review queue`, `My students`, and `Messages`. Leave `navByRole.student` unchanged.

#### 7. `frontend/src/lib/teacher-view-helpers.ts` & `frontend/src/lib/__tests__/teacher-view-helpers.test.ts` (Create)

*   **Type / Scope**: Shared Frontend Helpers & Unit Tests
*   **Proposed Changes**: Extract pure helpers for `deriveStudentReportStatus(reports)` (`"approved" | "needs_review" | "changes_requested" | "in_progress"`), `mapStudyType(studyType)`, and `filterSupervisedStudents(students, { studyTypeFilter, statusFilter, searchQuery })`, with unit tests covering all status/filter combinations and `studyType === null`.

#### 8. `frontend/src/app/teacher-view/page.tsx` (Modify)

*   **Type / Scope**: Teacher Review Queue Page
*   **Proposed Changes**:
    *   Remove `INITIAL_QUEUE_ITEMS` hardcoded mock data.
    *   Fetch live reports on mount via `apiFetch("/reports")` (excluding never-submitted `DRAFT`s), with loading and error banner states. Support `?internshipId=<id>` query parameter to auto-open that internship's review modal when linked from `My students`.
    *   Display live modal fields: `student.name`, `student.studyType`, `internship.title`, `company`, `realizedHours`, `credits`, `generalSummary`, and `reviews[0]?.comment` (removing the non-existent `programme` field).
    *   Wire `Approve report` and `Request changes` to `apiFetch("/reports/${id}/reviews", { method: "POST", ... })` (passing `creditsPutToOma` on approval), and wire the inline table OMA checkbox to `apiFetch("/internships/${internshipId}/credits", { method: "PATCH", ... })` with `pendingOmaIds` tracking.
    *   Add an `Evaluation` link (`/guidance-evaluation?internshipId=<id>`) in the queue row `Actions` column.

#### 9. `frontend/src/app/teacher-view/students/page.tsx` (Modify)

*   **Type / Scope**: Teacher My Students Page
*   **Proposed Changes**:
    *   Remove `SUPERVISED_STUDENTS` hardcoded mock data.
    *   Fetch supervised internships on mount via `apiFetch("/internships")` with loading and error states, displaying `internship.title` and `student.studyType` (`Päivätoteutus` / `Monimuoto` / `Unspecified`), and guarding `requiredHours > 0`.
    *   Wire the `Credits in OMA` checkbox to `apiFetch("/internships/${id}/credits", { method: "PATCH", ... })` with `pendingOmaIds` tracking, server-response reconciliation, and error rollback.
    *   Replace the flat `filterMode` pill row with the expandable selectable filter bar (`Study type`: `All`, `Päivätoteutus`, `Monimuoto`; `Status`: `All`, `In progress`, `Needs review`, `Changes requested`, `Approved`) using `filterSupervisedStudents`.
    *   Center-align the `Actions` column header and row action buttons (`Review` -> `/teacher-view?internshipId=<id>`, `Evaluation` -> `/guidance-evaluation?internshipId=<id>`, `Message` -> `/messages`).

#### 10. `frontend/e2e/teacher-view.spec.ts` (Create)

*   **Type / Scope**: Frontend E2E Test (Playwright)
*   **Proposed Changes**: Log in using seeded teacher credentials (`mikko.laine@metropolia.fi`), verify `Guidance evaluation` is absent from the sidebar, verify live data renders in `/teacher-view` and `/teacher-view/students`, test expanding the filter bar and combining `Study type` + `Status` filters, and verify navigating to `/guidance-evaluation?internshipId=...` from `My students`.

### Verification Plan

*   **Backend Compilation/Build**: `cd backend && npm run build` (`tsc`)
*   **Backend Tests**: `cd backend && npm run test:unit` and `cd backend && npm test`
*   **Frontend Compilation/Build**: `cd frontend && npm run build` (`next build`)
*   **Frontend Linting & Unit Tests**: `cd frontend && npm run lint && npm test`
*   **E2E Verification**: `cd frontend && npm run test:e2e` (against running backend + frontend)

--------------------------------------------------------------------------------

<!-- Provenance: Indicates initial structural drafting via EGM. -->

*Drafted with EGM*
