import { redisService } from './RedisService'
import type { PaymentsSummary } from '../types'

class PaymentService {
  public async getPaymentsSummary(from?: string, to?: string): Promise<PaymentsSummary> {
    return redisService.getPaymentsSummaryAsync(from, to);
  }

  public async purgePayments(): Promise<void> {
    await redisService.cleanUpPayments()
  }
}

export const paymentService = new PaymentService();
