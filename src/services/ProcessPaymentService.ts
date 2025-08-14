import type { Payment, PaymentData, ProcessorType } from "../types";
import { redisService } from './RedisService'

class ProcessPaymentService {
  private readonly processorDefaultUrl = process.env.PROCESSOR_DEFAULT_URL || '';
  private readonly processorFallbackUrl = process.env.PROCESSOR_FALLBACK_URL || '';

  public async processPayment(payment: Payment): Promise<boolean> {
    const processorToUse = await redisService.getCurrentProcessor();
    const processorMap = {
      'default': this.processorDefaultUrl,
      'fallback': this.processorFallbackUrl
    }

    const processorUrl = processorMap[processorToUse];

    const paymentData: PaymentData = {
      correlationId: payment.correlationId,
      amount: payment.amount,
      requestedAt: new Date().toISOString()
    };

    const isSuccess = await this.sendToProcessor(processorUrl, paymentData);

    if (isSuccess) {
      await this.savePayment(paymentData, processorToUse);
      return true;
    }

    const newProcessor = processorToUse === 'default' ? 'fallback' : 'default';
    const newProcessorUrl = processorMap[newProcessor];
    const retrySuccess = await this.sendToProcessor(newProcessorUrl, paymentData);

    if (retrySuccess) {
      this.savePayment(paymentData, newProcessor);
      return true;
    }

    return false;
  }

  private async sendToProcessor(url: string, payment: PaymentData): Promise<boolean> {
    try {
      const response = await fetch(url + '/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payment)
      });

      if (!response.ok) {
        return false;
      }

      return true;
    } catch (error) {
      return false
    }
  }

  private async savePayment(payment: PaymentData, processor: ProcessorType): Promise<void> {
    await redisService.savePayment(payment, processor);
  }
}

export const processPaymentService = new ProcessPaymentService();
