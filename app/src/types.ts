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
