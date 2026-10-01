import type { PrismaClient } from "@prisma/client";
import { toCityRecord } from "./mappers.js";
import type { CityRecord, UpsertCityInput } from "./types.js";

export type CityRepository = {
  findById: (id: string) => Promise<CityRecord | null>;
  findByOpenMeteoId: (openMeteoId: number) => Promise<CityRecord | null>;
  findByName: (name: string) => Promise<CityRecord | null>;
  upsert: (input: UpsertCityInput) => Promise<CityRecord>;
};

export function createCityRepository(prisma: PrismaClient): CityRepository {
  return {
    async findById(id) {
      const city = await prisma.city.findUnique({ where: { id } });
      return city ? toCityRecord(city) : null;
    },

    async findByOpenMeteoId(openMeteoId) {
      const city = await prisma.city.findUnique({ where: { openMeteoId } });
      return city ? toCityRecord(city) : null;
    },

    async findByName(name) {
      const trimmed = name.trim();
      if (trimmed.length === 0) {
        return null;
      }

      const city = await prisma.city.findFirst({
        where: {
          name: {
            equals: trimmed,
            mode: "insensitive",
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
      });

      return city ? toCityRecord(city) : null;
    },

    async upsert(input) {
      const city = await prisma.city.upsert({
        where: { openMeteoId: input.openMeteoId },
        create: {
          openMeteoId: input.openMeteoId,
          name: input.name,
          latitude: input.latitude,
          longitude: input.longitude,
          countryCode: input.countryCode,
          country: input.country,
          admin1: input.admin1,
          timezone: input.timezone,
          elevationMeters: input.elevationMeters,
          population: input.population,
        },
        update: {
          name: input.name,
          latitude: input.latitude,
          longitude: input.longitude,
          countryCode: input.countryCode,
          country: input.country,
          admin1: input.admin1,
          timezone: input.timezone,
          elevationMeters: input.elevationMeters,
          population: input.population,
        },
      });

      return toCityRecord(city);
    },
  };
}
