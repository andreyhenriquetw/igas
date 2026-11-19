import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { PrismaClient } from "@/generated/prisma/client";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não está configurada.");
  }

  const client = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}
