#!/bin/sh
set -e

echo "==> Running Prisma database migrations..."
npx prisma migrate deploy

echo "==> Seeding database..."
npm run seed || echo "Seed skipped or encountered a non-fatal warning."

exec "$@"

