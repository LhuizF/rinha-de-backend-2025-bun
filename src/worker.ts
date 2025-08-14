import { Worker, Job } from 'bullmq';
import { circuitPaymentService } from './services/CircuitPaymentService';
import Redis from 'ioredis';

const concurrency = 20;

export const startWorker = async () => {
  console.log('Starting worker...');
  new Worker('payment', async (job: Job) => {
    try {
      const paymentData = job.data
      const success = await circuitPaymentService.process(paymentData);

      if (!success) {
        throw new Error(`Processamento falhou para ${paymentData.correlationId}`);
      }

    } catch (err) {
      throw err;
    }
  }, {
    connection: new Redis(process.env.REDIS_URL!, {
      maxRetriesPerRequest: null,
    }),
    concurrency: concurrency,
  })
}
