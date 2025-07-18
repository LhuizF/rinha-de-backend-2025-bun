
import { database } from '../infra/database'
import { Pool } from "pg";
import { PaymentData, ProcessedPayment } from "../types";

export class StoreService {
  private cont = 0
  constructor(private readonly database: Pool) {
    if (!database) {
      throw new Error("Database connection is not set");
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
      console.error("Error saving payment data:", error);
      throw error;
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
      this.cont++;
      console.log(`Query executed ${this.cont} times`);
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
