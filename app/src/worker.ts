import { processPaymentService } from '../src/services/ProcessPaymentService';
import Redis from "ioredis";
import PQueue from 'p-queue';

const QUEUE_NAME = 'payment_queue';
const QUEUE_CONCURRENCY = process.env.QUEUE_CONCURRENCY ? parseInt(process.env.QUEUE_CONCURRENCY) : 10;

const queue = new PQueue({ concurrency: QUEUE_CONCURRENCY, autoStart: true });

const startWorker = async () => {
  console.log('starting worker queue concurrency', QUEUE_CONCURRENCY);

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error("REDIS_URL environment variable is not set");
  }
  const redis = new Redis(redisUrl);
  //bad
  while (true) {

    try {
      const payment = await redis.brpop(QUEUE_NAME, 0);

      if (payment) {
        const paymentData = JSON.parse(payment[1]);
        queue.add(() => processPaymentService.processPayment(paymentData, true));

      }
    } catch (error) {
      console.error('[Worker] Error processing payment:', error);
    }
  }
}

startWorker()
