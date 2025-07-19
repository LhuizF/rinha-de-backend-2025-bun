import { ProcessorType } from "../types";
import { storeService, StoreService } from "./StoreService";

class PaymentService {
  private readonly storeService: StoreService = storeService;

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

export const paymentService = new PaymentService();
