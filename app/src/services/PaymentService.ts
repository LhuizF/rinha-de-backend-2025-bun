import { PaymentData } from "../types";
import { fetch } from "undici";
import { storeService, StoreService } from "./StoreService";
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


  async processPayment(payment: PaymentData,): Promise<string> {
    return new Promise((resolve) => {
      this.tryProcessPayment(payment, resolve);
    })
  }

  private async tryProcessPayment(payment: PaymentData, resolve: (processor: 'default' | 'fallback') => void): Promise<void> {
    try {
      await this.sendToProcessor(this.processorDefaultUrl, payment);

      resolve('default');
    } catch (error) {
      try {
        await this.sendToProcessor(this.processorFallbackUrl, payment);

        resolve('fallback');
      } catch (error) {
        setTimeout(() => this.tryProcessPayment(payment, resolve), 1000);
      }
    }
  }

  private async sendToProcessor(url: string, payment: PaymentData): Promise<void> {
    const response = await fetch(url + '/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payment)
    });

    if (!response.ok) {
      throw new Error(`Failed to send payment to processor at ${url}`);
    }

    console.log(`[PaymentService] ${url} Success ${payment.correlationId}`);
  }

  public async savePayment(payment: PaymentData, processor: string): Promise<void> {
    await this.storeService.savePayment(payment, processor);
  }

  public async getPaymentsSummary(from?: string, to?: string): Promise<any> {
    const payments = await this.storeService.findAllPayments(from, to);

    const summary = {
      default: { totalRequests: 0, totalAmount: 0 },
      fallback: { totalRequests: 0, totalAmount: 0 }
    };

    for (const row of payments) {
      const processor = row.processor as 'default' | 'fallback';
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
