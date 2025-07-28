
import { database } from '../infra/database'
import { Pool } from "pg";
import { PaymentData, ProcessedPayment } from "../types";

export class StoreService {
  private paymentQueue: ProcessedPayment[] = [];
  private readonly BATCH_SIZE = 200
  private readonly BATCH_INTERVAL_MS = 500;
  private batchTimer: NodeJS.Timeout | null = null;

  constructor(private readonly database: Pool) {
    if (!database) {
      throw new Error("Database connection is not set");
    }
  }

  async queuePayment(paymentData: PaymentData, processor: string): Promise<void> {
    this.paymentQueue.push({ ...paymentData, processor });

    if (this.paymentQueue.length >= this.BATCH_SIZE) {
      this.processPaymentQueue();
      return;
    }

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.processPaymentQueue()
      }, this.BATCH_INTERVAL_MS);
    }
  }

  private async processPaymentQueue(): Promise<void> {

    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    if (this.paymentQueue.length === 0) {
      return
    }

    const paymentsToProcess = [...this.paymentQueue]

    const query = []
    const values = []

    for (let index = 0; index < paymentsToProcess.length; index++) {
      const payment = paymentsToProcess[index];

      query.push(`($${index * 4 + 1}, $${index * 4 + 2}, $${index * 4 + 3}, $${index * 4 + 4})`);

      values.push(
        payment.correlationId,
        Math.round(payment.amount * 100),
        payment.processor,
        new Date().toISOString()
      );
    }

    const insertQuery = `
      INSERT INTO processed_payments (correlation_id, amountInCents, processor, processed_at)
      VALUES ${query.join(", ")}
    `

    this.paymentQueue = []
    try {
      await this.database.query(insertQuery, values);
      console.log(`[StoreService] ${new Date().toISOString()} : ${paymentsToProcess.length}`);
    } catch (error) {
      console.error(`Error`, error);
    }
  }

  async savePayment(paymentData: PaymentData, processor: string): Promise<void> {
    const query = `
      INSERT INTO processed_payments (correlation_id, amountInCents, processor, processed_at)
      VALUES ($1, $2, $3, $4)
    `;
    const values = [
      paymentData.correlationId,
      Math.round(paymentData.amount * 100),
      processor,
      paymentData.requestedAt
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
