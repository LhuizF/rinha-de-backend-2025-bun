export interface Payment {
  correlationId: string;
  amount: number;
}

export interface PaymentData {
  correlationId: string;
  amount: number;
  requestedAt: string;
}

export interface ProcessedPayment extends PaymentData {
  processor: string;
}

export type ProcessorType = 'default' | 'fallback';

export interface PaymentJob {
  name: string;
  data: PaymentData;
  opts: {
    jobId: string;
    attempts: number;
    backoff: number;
    removeOnComplete: boolean;
    removeOnFail: boolean;
  }
}

export interface PaymentsSummary {
  default: SummaryDetails;
  fallback: SummaryDetails;
}

interface SummaryDetails {
  totalRequests: number;
  totalAmount: number;
}
