import { PrismaClient } from "@prisma/client";

// Standard Next.js dev-mode singleton so hot-reload doesn't spawn a new
// PrismaClient (and a new connection) on every file edit.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient() {
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
  // WAL lets reads proceed while a write is in flight (and is persisted in the db file);
  // busy_timeout makes an external process holding the lock (e.g. a backup) wait
  // instead of failing. The URL's connection_limit=1 means this applies to every query.
  client.$queryRawUnsafe("PRAGMA journal_mode = WAL").catch(() => {});
  client.$queryRawUnsafe("PRAGMA busy_timeout = 5000").catch(() => {});
  return client;
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
