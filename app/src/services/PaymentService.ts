import { redisService } from './RedisService'

class PaymentService {


  public async getPaymentsSummary(from?: string, to?: string): Promise<any> {
    return redisService.getPaymentsSummaryAsync(from, to);
  }

  public async purgePayments(): Promise<void> {
    await redisService.cleanUpPayments()
  }

}

export const paymentService = new PaymentService();
