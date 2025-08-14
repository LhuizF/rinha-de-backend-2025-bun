import { redisService } from './RedisService';
import type { Payment } from '../types';

class InMemoryService {
  private queue: Payment[] = [];
  private readonly FLUSH_INTERVAL_MS = 500;
  private readonly BATCH_SIZE = 250;

  constructor() {
    console.log('interval:', this.FLUSH_INTERVAL_MS, 'batch size:', this.BATCH_SIZE,);
    this.startFlusher()
  }

  public add(payment: Payment) {
    this.queue.push(payment);
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
