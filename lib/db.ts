import { PrismaClient } from '@prisma/client'

// Cache key includes a version suffix so we can force-recreate the client
// after a schema change by bumping the suffix (avoids stale-client issues
// in dev where globalThis persists across HMR).
const DB_CACHE_KEY = 'prisma_hustlecart_v10'

const globalForPrisma = globalThis as unknown as {
  [key: string]: PrismaClient | undefined
}

export const db =
  globalForPrisma[DB_CACHE_KEY] ??
  new PrismaClient({
    log: ['query'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma[DB_CACHE_KEY] = db