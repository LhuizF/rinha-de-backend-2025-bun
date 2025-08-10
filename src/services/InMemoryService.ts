import { redisService } from './RedisService';
import type { Payment, PaymentJob } from '../types';

class InMemoryService {
  private queue: PaymentJob[] = [];
  private readonly FLUSH_INTERVAL_MS = 50;
  private readonly BATCH_SIZE = 350;

  constructor() {
    // console.log('InMemoryService initialized', this.BATCH_SIZE);
    this.startFlusher()
  }

  public add(payment: Payment) {
    const requestedAt = new Date().toISOString();
    this.queue.push({
      name: 'payment',
      data: { ...payment, requestedAt },
      opts: {
        jobId: payment.correlationId,
        attempts: 3,
        backoff: 5000,
        removeOnComplete: true,
        removeOnFail: false
      }
    });
  }

  private startFlusher() {
    setInterval(() => {
      if (this.queue.length === 0) {
        return
      }

      const batch = this.queue.splice(0, this.BATCH_SIZE);
      redisService.addBatchToQueue(batch);

    }, this.FLUSH_INTERVAL_MS);
  }
}

export const inMemoryService = new InMemoryService();
