import { beforeAll, afterEach, afterAll } from 'vitest'
import { PrismaClient } from '@/prisma/generated/prisma/client'

const prisma = new PrismaClient()

beforeAll(async () => {
  await prisma.$connect()
})

afterEach(async () => {
  const tx = prisma.$transaction([
    prisma.trade.deleteMany({}),
    prisma.account.deleteMany({}),
    prisma.user.deleteMany({}),
  ])
  await tx
})

afterAll(async () => {
  await prisma.$disconnect()
})

export { prisma }
