-- CreateTable
CREATE TABLE "City" (
    "id" TEXT NOT NULL,
    "openMeteoId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "countryCode" TEXT,
    "country" TEXT,
    "admin1" TEXT,
    "timezone" TEXT,
    "elevationMeters" DOUBLE PRECISION,
    "population" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "City_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyForecast" (
    "id" TEXT NOT NULL,
    "cityId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "temperatureMaxC" DOUBLE PRECISION NOT NULL,
    "temperatureMinC" DOUBLE PRECISION NOT NULL,
    "precipitationSumMm" DOUBLE PRECISION NOT NULL,
    "snowfallSumCm" DOUBLE PRECISION NOT NULL,
    "windSpeedMaxKmh" DOUBLE PRECISION NOT NULL,
    "waveHeightMaxM" DOUBLE PRECISION,
    "wavePeriodMaxS" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyForecast_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "City_openMeteoId_key" ON "City"("openMeteoId");

-- CreateIndex
CREATE INDEX "City_name_idx" ON "City"("name");

-- CreateIndex
CREATE INDEX "DailyForecast_cityId_date_idx" ON "DailyForecast"("cityId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "DailyForecast_cityId_date_key" ON "DailyForecast"("cityId", "date");

-- AddForeignKey
ALTER TABLE "DailyForecast" ADD CONSTRAINT "DailyForecast_cityId_fkey" FOREIGN KEY ("cityId") REFERENCES "City"("id") ON DELETE CASCADE ON UPDATE CASCADE;
