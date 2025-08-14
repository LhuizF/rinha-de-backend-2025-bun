import type { Payment, PaymentData, ProcessorType } from "../types";
import { redisService } from './RedisService';

enum CircuitState {
  Closed = 1,
  Open
}

class CircuitPaymentService {
  private readonly processorDefaultUrl = `${process.env.PROCESSOR_DEFAULT_URL}/payments`;
  private readonly processorFallbackUrl = `${process.env.PROCESSOR_FALLBACK_URL}/payments`;

  private readonly MAX_FAILURES = 5;
  private readonly OPEN_TIMEOUT = 250;
  private circuitState = CircuitState.Closed;
  private failures = 0;
  private lastOpenTime = 0;

  public async process(payment: Payment): Promise<boolean> {

    const now = Date.now();
    if (this.circuitState === CircuitState.Open && now - this.lastOpenTime > this.OPEN_TIMEOUT) {
      this.resetCircuit();
    }

    if (this.circuitState === CircuitState.Closed) {
      const success = await this.tryProcessor(this.processorDefaultUrl, payment, 'default');
      if (success) {
        this.resetFailures();
        return true;
      }

      this.registerFailure();
    }

    const fallbackSuccess = await this.tryProcessor(this.processorFallbackUrl, payment, 'fallback');

    return fallbackSuccess;
  }

  private async tryProcessor(url: string, payment: Payment, processor: ProcessorType): Promise<boolean> {
    const paymentData: PaymentData = {
      correlationId: payment.correlationId,
      amount: payment.amount,
      requestedAt: new Date().toISOString()
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });

      if (response.ok) {
        this.savePayment(paymentData, processor)
        return true
      }
      return false
    } catch (error) {
      return false
    }
  }

  private savePayment(payment: PaymentData, processor: ProcessorType): void {
    redisService.savePayment(payment, processor).catch(err => {
      console.error("Erro ao salvar pagamento no Redis (background):", err);
    });
  }

  private registerFailure() {
    this.failures++;
    if (this.failures >= this.MAX_FAILURES) {
      this.circuitState = CircuitState.Open;
      this.lastOpenTime = Date.now();
    }
  }

  private resetFailures() {
    if (this.failures > 0) {
      this.failures = 0;
    }
  }

  private resetCircuit() {
    this.circuitState = CircuitState.Closed;
    this.resetFailures();
  }
}

export const circuitPaymentService = new CircuitPaymentService();
