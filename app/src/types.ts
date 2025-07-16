export interface Payment {
  correlationId: string;
  amount: number;
}

export interface PaymentData {
  correlationId: string;
  amountInCents: number;
  receivedAt: Date;
}
