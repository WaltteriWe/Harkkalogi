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

## Docker Setup

The application is containerized with services:
- **`postgres`**: PostgreSQL 16 database (`postgres:16-alpine`)
- **`backend`**: Express API server (`node:22-bookworm-slim`) on port `4000`
- **`frontend`**: Next.js web application (`node:22-bookworm-slim`) on port `3000`
- **`studio`**: Prisma Studio visual database viewer on port `5555`

### 1. Development (with Hot-Reloading)

Start all services in development mode:

```bash
docker compose up
```

- Web UI: http://localhost:3000
- API: http://localhost:4000/api
- Prisma Studio: http://localhost:5555
- Database migrations and test user seed data are automatically applied on startup.

Default test accounts (password: `password123`):
- Student: `aino.korhonen@metropolia.fi`
- Teacher: `mikko.laine@metropolia.fi`
- Admin: `admin@metropolia.fi`

To stop containers:
```bash
docker compose down
```

### 2. Production Build

Start the production-ready standalone build:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

### 3. Database Utility Commands

Run Prisma Studio (Visual DB viewer at http://localhost:5555):
```bash
# Via Docker:
docker compose exec backend npm run studio

# Or directly on host:
cd backend && npm run studio
```

Run seed manually:
```bash
docker compose exec backend npm run seed
```
