import { PaymentData, ProcessorType } from "../types";
import { fetch } from "undici";
import { storeService, StoreService } from "./StoreService";
import { healthService } from "./HealthService";

class PaymentService {
  private readonly processorDefaultUrl: string;
  private readonly processorFallbackUrl: string;

  constructor(
    processorDefaultUrl: string,
    processorFallbackUrl: string,
    private readonly storeService: StoreService,
  ) {

    if (!processorDefaultUrl || !processorFallbackUrl) {
      throw new Error("Processor URLs must be provided");
    }

    this.processorDefaultUrl = processorDefaultUrl;
    this.processorFallbackUrl = processorFallbackUrl;
  }

  async tryProcessPayment(payment: PaymentData): Promise<boolean> {
    const processorToUse = await healthService.getProcessor();

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
      await this.savePayment(payment, newProcessor);
      return true;
    }

    console.log(`[PaymentService] Failed to process payment ${payment.correlationId} on both processors.`);
    return false;
  }

  public async sendToProcessor(url: string, payment: PaymentData): Promise<boolean> {
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
        console.error('[PaymentService] Error', url, response.statusText);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`[PaymentService] Error catch`, url, error);
      return false;
    }
  }

  private async savePayment(payment: PaymentData, processor: ProcessorType): Promise<void> {
    await this.storeService.savePayment(payment, processor);
  }

  public async getPaymentsSummary(from?: string, to?: string): Promise<any> {
    const payments = await this.storeService.findAllPayments(from, to);

    const summary = {
      default: { totalRequests: 0, totalAmount: 0 },
      fallback: { totalRequests: 0, totalAmount: 0 }
    };

    for (const row of payments) {
      const processor = row.processor as ProcessorType
      if (summary[processor]) {
        summary[processor].totalRequests = parseInt(row.totalRequests, 10);
        summary[processor].totalAmount = parseFloat(row.totalAmount) / 100;
      }
    }

    return summary;
  }

  public async purgePayments(): Promise<void> {
    await this.storeService.cleanUpPayments();
  }

}

export const paymentService = new PaymentService(
  process.env.PROCESSOR_DEFAULT_URL || '',
  process.env.PROCESSOR_FALLBACK_URL || '',
  storeService
);
