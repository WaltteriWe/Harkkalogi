#!/bin/sh
set -e

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running Prisma database migrations..."
npx prisma migrate deploy

echo "==> Seeding database..."
npm run seed || echo "Seed skipped or encountered a non-fatal warning."

exec "$@"

