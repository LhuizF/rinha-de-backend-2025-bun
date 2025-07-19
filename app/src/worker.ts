import { processPaymentService } from '../src/services/ProcessPaymentService';
import Redis from "ioredis";

const QUEUE_NAME = 'payment_queue';

export const startWorker = async () => {
  console.log('starting worker');

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
        processPaymentService.processPayment(paymentData, true)

      }
    } catch (error) {
      console.error('[Worker] Error processing payment:', error);
    }
  }
}

