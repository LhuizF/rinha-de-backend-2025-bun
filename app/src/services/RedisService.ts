import Redis from "ioredis";
import { PaymentData, ProcessorType } from "../types";
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

  async addToQueue(correlationId: string, amount: number): Promise<void> {
    const requestedAt = new Date().toISOString();
    const paymentData: PaymentData = {
      correlationId,
      amount,
      requestedAt
    }

    await paymentQueue.add(this.QUEUE_NAME, paymentData, {
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
    const response = {
      default: {
        totalRequests: 0,
        totalAmount: 0
      },
      fallback: {
        totalRequests: 0,
        totalAmount: 0
      }
    };

    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    const paymentIds = await this.redis.zrangebyscore(this.PAYMENT_INDEX, fromDate.getTime(), toDate.getTime());

    if (paymentIds.length === 0) {
      return response
    }

    const paymentKeys = paymentIds.map(id => `${this.PAYMENT_JSON}:${id}`)

    const paymentsData = await this.redis.mget(paymentKeys)
    for (let i = 0; i < paymentsData.length; i++) {
      const paymentData = paymentsData[i];
      if (!paymentData) continue

      const { processor, amountInCents } = JSON.parse(paymentData) as PaymentSaved;

      const responseProcessor = response[processor]
      responseProcessor.totalRequests++
      const totalAmount = parseFloat((responseProcessor.totalAmount + amountInCents / 100).toFixed(2))

      responseProcessor.totalAmount = totalAmount
    }

    return response
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
}

export const redisService = new RedisService(process.env.REDIS_URL || '');

interface PaymentsSummary {
  default: SummaryDetails;
  fallback: SummaryDetails;
}
interface SummaryDetails {
  totalRequests: number;
  totalAmount: number;
}

interface PaymentSaved {
  correlationId: string;
  amountInCents: number;
  requestedAt: string;
  processor: ProcessorType;
}

