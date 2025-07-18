export interface Payment {
  correlationId: string;
  amount: number;
}

export interface PaymentData {
  correlationId: string;
  amount: number;
  receivedAt: string;
}

export interface ProcessedPayment extends PaymentData {
  processor: string;
}
