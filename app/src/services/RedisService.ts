import Redis from "ioredis";
import { PaymentData } from "../types";

class RedisService {
  private redis: Redis;
  private readonly QUEUE_NAME = 'payment_queue';

  constructor(redisUrl: string) {
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not valid");
    }

    this.redis = new Redis(redisUrl);
    this.redis.on('connect', () => {
      console.log('[QueueService] Redis Conectado com sucesso!');
    });
  }

  async addToQueue(correlationId: string, amount: number): Promise<void> {
    const receivedAt = new Date().toISOString();
    const paymentData = {
      correlationId,
      amount,
      receivedAt
    }

    await this.redis.lpush(this.QUEUE_NAME, JSON.stringify(paymentData));
  }
}


export const redisService = new RedisService(process.env.REDIS_URL || '');

