import Redis from "ioredis";
import type { PaymentData, ProcessorType, PaymentJob, PaymentsSummary } from "../types";
import { paymentQueue } from '../queue'

class RedisService {
  private redis: Redis;
  private readonly QUEUE_NAME = 'payment_queue';

  private readonly PAYMENT_INDEX = "payment:index";
  private readonly PAYMENT_JSON = "payment:json:";

  constructor(redisUrl: string) {
    if (!redisUrl) {
      throw new Error("REDIS_URL environment variable is not valid");
    }

    this.redis = new Redis(redisUrl);
    this.redis.on('connect', () => {
      console.log('[QueueService] Redis Conectado com sucesso!');
    });
  }

  addToQueue(correlationId: string, amount: number): void {
    const requestedAt = new Date().toISOString();
    const paymentData: PaymentData = {
      correlationId,
      amount,
      requestedAt
    }

    void paymentQueue.add(this.QUEUE_NAME, paymentData, {
      jobId: correlationId,
      attempts: 3,
      backoff: 5000,
      removeOnComplete: true,
      removeOnFail: false
    })
  }

  async savePayment(payment: PaymentData, processor: ProcessorType): Promise<void> {
    const data: PaymentSaved = {
      ...payment,
      amountInCents: Math.round(payment.amount * 100),
      processor
    }

    const key = `${this.PAYMENT_JSON}:${payment.correlationId}`
    await this.redis.set(key, JSON.stringify(data))

    const dateTime = new Date(payment.requestedAt).getTime()

    await this.redis.zadd(this.PAYMENT_INDEX, dateTime, payment.correlationId)
  }

  async getPaymentsSummaryAsync(from?: string, to?: string): Promise<PaymentsSummary> {
    const defaultSummary = {
      totalRequests: 0,
      totalAmount: 0
    };
    const fallbackSummary = {
      totalRequests: 0,
      totalAmount: 0
    };

    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    const paymentIds = await this.redis.zrangebyscore(this.PAYMENT_INDEX, fromDate.getTime(), toDate.getTime());

    if (paymentIds.length === 0) {
      return {
        default: defaultSummary,
        fallback: fallbackSummary
      };
    }

    const paymentKeys = paymentIds.map(id => `${this.PAYMENT_JSON}:${id}`)

    const paymentsData = await this.redis.mget(paymentKeys)
    for (const paymentData of paymentsData) {
      if (paymentData) {
        const parsedData = JSON.parse(paymentData) as PaymentSaved

        if (parsedData.processor === 'default') {
          defaultSummary.totalRequests += 1
          defaultSummary.totalAmount += parsedData.amountInCents
        } else
          if (parsedData.processor === 'fallback') {
            fallbackSummary.totalRequests += 1
            fallbackSummary.totalAmount += parsedData.amountInCents
          }
      }
    }

    return {
      default: {
        totalRequests: defaultSummary.totalRequests,
        totalAmount: defaultSummary.totalAmount / 100
      },
      fallback: {
        totalRequests: fallbackSummary.totalRequests,
        totalAmount: fallbackSummary.totalAmount / 100
      }
    }
  }

  public async cleanUpPayments(): Promise<void> {
    const keys = await this.redis.keys(`${this.PAYMENT_JSON}:*`)
    if (keys.length > 0) {
      await this.redis.del(...keys)
    }
    await this.redis.del(this.PAYMENT_INDEX);
    console.log('[RedisService] Cleaned up payments data.')
  }

  getRedis(): Redis {
    return this.redis;
  }

  addBatchToQueue(payments: PaymentJob[]): void {

    if (payments.length > 0) {
      void paymentQueue.addBulk(payments);
    }
  }
}

export const redisService = new RedisService(process.env.REDIS_URL || '');

interface PaymentSaved {
  correlationId: string;
  amountInCents: number;
  requestedAt: string;
  processor: ProcessorType;
}
