-- CreateEnum
CREATE TYPE "TripRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('PLANNED', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destinationName" TEXT NOT NULL,
    "destinationLat" DOUBLE PRECISION NOT NULL,
    "destinationLon" DOUBLE PRECISION NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_members" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "TripRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "category" TEXT,
    "lat" DOUBLE PRECISION NOT NULL,
    "lon" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'nominatim',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "notes" TEXT,
    "category" TEXT,
    "status" "ActivityStatus" NOT NULL DEFAULT 'PLANNED',
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'GBP',
    "paidByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_participants" (
    "id" TEXT NOT NULL,
    "expenseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shareCents" INTEGER NOT NULL,

    CONSTRAINT "expense_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "geocode_cache" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "resultsJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "geocode_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "durationSec" DOUBLE PRECISION NOT NULL,
    "distanceM" DOUBLE PRECISION NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "route_cache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weather_cache" (
    "id" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "dataJson" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weather_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refreshTokenHash_key" ON "sessions"("refreshTokenHash");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "trips_ownerId_idx" ON "trips"("ownerId");

-- CreateIndex
CREATE INDEX "trip_members_userId_idx" ON "trip_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_members_tripId_userId_key" ON "trip_members"("tripId", "userId");

-- CreateIndex
CREATE INDEX "places_tripId_idx" ON "places"("tripId");

-- CreateIndex
CREATE INDEX "activities_tripId_date_idx" ON "activities"("tripId", "date");

-- CreateIndex
CREATE INDEX "expenses_tripId_idx" ON "expenses"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "expense_participants_expenseId_userId_key" ON "expense_participants"("expenseId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "geocode_cache_query_key" ON "geocode_cache"("query");

-- CreateIndex
CREATE UNIQUE INDEX "route_cache_cacheKey_key" ON "route_cache"("cacheKey");

-- CreateIndex
CREATE UNIQUE INDEX "weather_cache_cacheKey_key" ON "weather_cache"("cacheKey");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_members" ADD CONSTRAINT "trip_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_paidByUserId_fkey" FOREIGN KEY ("paidByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_expenseId_fkey" FOREIGN KEY ("expenseId") REFERENCES "expenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expense_participants" ADD CONSTRAINT "expense_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
