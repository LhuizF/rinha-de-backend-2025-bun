
import { database } from '../infra/database'
import { Pool } from "pg";
import { PaymentData, ProcessedPayment } from "../types";

export class StoreService {
  private paymentQueue: ProcessedPayment[] = [];
  private readonly BATCH_SIZE = 200
  private readonly BATCH_INTERVAL_MS = 200;
  private batchTimer: NodeJS.Timeout | null = null;
  private isProcessing = false;

  constructor(private readonly database: Pool) {
    if (!database) {
      throw new Error("Database connection is not set");
    }

    setInterval(() => this.processPaymentQueue(), this.BATCH_INTERVAL_MS);
  }

  async queuePayment(paymentData: PaymentData, processor: string): Promise<void> {
    this.paymentQueue.push({ ...paymentData, processor });

    if (this.paymentQueue.length >= this.BATCH_SIZE) {
      this.processPaymentQueue();
      return;
    }

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.processPaymentQueue(), this.BATCH_INTERVAL_MS);
    }
  }

  private async processPaymentQueue(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.paymentQueue.length === 0) {
      this.isProcessing = false;
      return;
    }

    const paymentsToProcess = this.paymentQueue.splice(0, this.BATCH_SIZE);

    const query: string[] = [];
    const values: any[] = [];

    for (let i = 0; i < paymentsToProcess.length; i++) {
      const payment = paymentsToProcess[i];
      query.push(`($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3}, $${i * 4 + 4})`);
      values.push(
        payment.correlationId,
        Math.round(payment.amount * 100),
        payment.processor,
        payment.requestedAt
      );
    }

    const insertQuery = `
      INSERT INTO processed_payments (correlation_id, amountInCents, processor, processed_at)
      VALUES ${query.join(", ")}
    `;

    try {
      await this.database.query(insertQuery, values);
      console.log(`[StoreService] ${new Date().toISOString()} : Processed ${paymentsToProcess.length} payments`);
    } catch (error) {
      console.error(`[StoreService] Failed to process payments`, error);
      this.paymentQueue.unshift(...paymentsToProcess); // Reinsere em caso de erro
    } finally {
      this.isProcessing = false;

      // 🔁 Agendar nova execução se ainda houver dados
      if (this.paymentQueue.length > 0) {
        this.batchTimer = setTimeout(() => this.processPaymentQueue(), this.BATCH_INTERVAL_MS);
      }
    }
  }

  async savePayment(paymentData: PaymentData, processor: string): Promise<void> {
    const query = `
      INSERT INTO processed_payments (correlation_id, amountInCents, processor)
      VALUES ($1, $2, $3)
    `;
    const values = [
      paymentData.correlationId,
      Math.round(paymentData.amount * 100),
      processor
    ];

    try {
      await this.database.query(query, values);
    } catch (error) {
      console.error("Error saving payment:", error);
      console.log('[Time]', new Date().toISOString());
    }
  }

  async findAllPayments(from?: string, to?: string): Promise<any> {
    let query = `
        SELECT
            processor,
            COUNT(*) AS "totalRequests",
            SUM(amountInCents) AS "totalAmount"
        FROM
            processed_payments`

    const params = [];
    if (from && to) {
      query += ' WHERE processed_at BETWEEN $1 AND $2'
      params.push(from, to);
    } else if (from) {
      query += ' WHERE processed_at >= $1'
      params.push(from);
    } else if (to) {
      query += ' WHERE processed_at <= $1'
      params.push(to);
    }

    query += ' GROUP BY processor;';

    try {
      const result = await this.database.query(query, params);
      return result.rows;
    } catch (error) {
      console.error("Error fetching payments:", error);
      return []
    }
  }

  async cleanUpPayments(): Promise<void> {
    try {
      await database.query('DELETE FROM processed_payments;')

    } catch (error) {
      console.error("Error purging payments:", error)
    }
  }
}


export const storeService = new StoreService(database);
