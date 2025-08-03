import { PaymentData, ProcessorType } from "../types";
import { healthService } from "./HealthService";
import { redisService } from './RedisService'

class ProcessPaymentService {
  private readonly processorDefaultUrl = process.env.PROCESSOR_DEFAULT_URL || '';
  private readonly processorFallbackUrl = process.env.PROCESSOR_FALLBACK_URL || '';

  public async processPayment(payment: PaymentData, useHealth?: boolean): Promise<boolean> {
    return this.processPaymentWithHealth(payment);
  }

  private async processPaymentWithHealth(payment: PaymentData): Promise<boolean> {
    const processorToUse = await healthService.getProcessor()

    const processorMap = {
      'default': this.processorDefaultUrl,
      'fallback': this.processorFallbackUrl
    }

    const processorUrl = processorMap[processorToUse];

    const isSuccess = await this.sendToProcessor(processorUrl, payment);

    if (isSuccess) {
      await this.savePayment(payment, processorToUse);
      return true;
    }

    const newProcessor = processorToUse === 'default' ? 'fallback' : 'default';
    const newProcessorUrl = processorMap[newProcessor];
    const retrySuccess = await this.sendToProcessor(newProcessorUrl, payment);

    if (retrySuccess) {
      this.savePayment(payment, newProcessor);
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
