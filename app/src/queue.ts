import { Queue } from 'bullmq'
import { Redis } from 'ioredis'

export const paymentQueue = new Queue('payment', {
  connection: new Redis(process.env.REDIS_URL!, {
    maxRetriesPerRequest: null,
  }),
})
