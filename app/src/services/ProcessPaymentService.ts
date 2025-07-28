import { PaymentData, ProcessorType } from "../types";
import { storeService, StoreService } from "./StoreService";
import { healthService } from "./HealthService";
import { redisService } from './RedisService'

class ProcessPaymentService {
  private readonly processorDefaultUrl = process.env.PROCESSOR_DEFAULT_URL || '';
  private readonly processorFallbackUrl = process.env.PROCESSOR_FALLBACK_URL || '';

  private readonly storeService: StoreService = storeService;

  /**
   * Processa o pagamento usando primeiro o Default e depois o Fallback, se ambos falharem, tenta novamente. (Recursividade)
   */
  public processPayment(payment: PaymentData): Promise<boolean>

  /**
   * Usa os endpoints de Health para decidir qual processador usar.
   */
  public processPayment(payment: PaymentData, useHealth: boolean): Promise<boolean>

  public async processPayment(payment: PaymentData, useHealth?: boolean): Promise<boolean> {
    if (useHealth) {
      return this.processPaymentWithHealth(payment);
    }

    return this.processPaymentWithRetry(payment);
  }

  private async processPaymentWithRetry(payment: PaymentData): Promise<boolean> {
    const process = await new Promise<ProcessorType>((resolve) => {
      this.tryProcessPayment(payment, resolve);
    })

    await this.savePayment(payment, process);
    return true;
  }

  private async tryProcessPayment(payment: PaymentData, resolve: (processor: ProcessorType) => void): Promise<void> {
    try {
      await this.sendToProcessor(this.processorDefaultUrl, payment);

      resolve('default');
    } catch (error) {
      try {
        await this.sendToProcessor(this.processorFallbackUrl, payment);

        resolve('fallback');
      } catch (error) {
        setTimeout(() => this.tryProcessPayment(payment, resolve), 500);
      }
    }
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
    // console.log('requeue')
    // redisService.addToQueue(payment.correlationId, payment.amount);
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
      return false;
    }
  }

  private async savePayment(payment: PaymentData, processor: ProcessorType): Promise<void> {
    await this.storeService.queuePayment(payment, processor);
  }
}

export const processPaymentService = new ProcessPaymentService();
