# HarkkaLogi – Internship Reporting Prototype

Prototype for improving Metropolia's internship (harjoittelu) reporting process, built as part of a course project testing the Wihi9 system.

> ⚠️ **Work in progress.** This is an early prototype. Structure, stack, and features will change.

## About

Students report on internships they have completed; teachers review and approve reports; admins manage the system. This prototype explores improvements based on user stories, system requirements, and usability testing of the current Wihi9 test version.

### User roles
- **Student** – submits and tracks internship reports
- **Teacher** – reviews, comments on, and approves reports
- **Admin** – manages users, settings, and system data

## Tech stack

| Layer    | Technology              |
|----------|-------------------------|
| Frontend | Next.js / React         |
| Backend  | Node.js                 |
| Database | Prisma                  |
| Hosting  | TBD                     |

## Local authentication setup

The frontend calls the separate Node.js API in `backend` (default:
`http://localhost:4000`). Copy `frontend/.env.example` to
`frontend/.env.local` if the API uses a different URL.

1. Configure the PostgreSQL connection in `backend/.env` using
   `backend/.env.example`. PostgreSQL is exposed on `localhost:55432` by
   default. From the repository root, start it with
   `docker compose --env-file .\backend\.env up -d`, or run `npm run db:up`
   from `backend`. This also starts MinIO for private profile photo storage.
   Set `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD` to unique local values, and
   set `S3_ACCESS_KEY` and `S3_SECRET_KEY` to those same values. MinIO's S3
   endpoint is `http://localhost:19000`; its local console is at
   `http://localhost:19001`.
2. Run `npm run generate` and `npm run migrate` from `backend` to generate the
   Prisma client and apply database migrations.
3. Create the first administrator with `INITIAL_ADMIN_EMAIL`,
   `INITIAL_ADMIN_NAME`, `INITIAL_ADMIN_TITLE`, and `INITIAL_ADMIN_PASSWORD`
   set in the environment, then run `npm run bootstrap:admin` from `backend`.
   The initial admin password must be at least 12 characters. The command
   refuses to run if an admin already exists.
4. Start the API with `npm run dev` from `backend` and the UI with `npm run dev`
   from `frontend`.

Administrators create user accounts from **Users and roles**. Each new account
receives a one-time temporary password and must change it at first sign-in.
Forgotten passwords are reset by an administrator, who shares a new temporary
password with the user. Passwords are stored as scrypt hashes and sessions are
stored server-side; the browser receives only an HttpOnly session cookie.

Users can update their phone number, address, biography, study programme, and
profile photo from **My profile**. Profile photos are limited to PNG, JPEG, or
WebP files up to 5 MB and are stored privately in MinIO; only the signed-in
account can view its photo.

To assign a student to a teacher, open **Admin → Users and roles** and choose
the teacher in that student's **Supervising teacher** selector. The assignment
is saved immediately and the student appears in that teacher's **My students**
list. Choose **Not assigned** to remove the assignment. Each student can have
one supervising teacher.
