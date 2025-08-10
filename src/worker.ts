import { Worker, Job } from 'bullmq';
import { processPaymentService } from './services/ProcessPaymentService';
import { redisService } from './services/RedisService';

const redis = redisService.getRedis();

const concurrency = 20

export const startWorker = async () => {
  console.log('Starting worker...');
  new Worker('payment', async (job: Job) => {
    try {
      const paymentData = job.data
      const success = await processPaymentService.processPayment(paymentData);

      if (!success) {
        throw new Error(`Processamento falhou para ${paymentData.correlationId}`);
      }

    } catch (err) {
      throw err;
    }
  }, {
    connection: {
      host: redis.options.host,
      port: redis.options.port,
      maxRetriesPerRequest: null,
    },
    concurrency: concurrency,
  })
}
