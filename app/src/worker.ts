import { getQueueChannel } from './queue';
import { ConsumeMessage } from 'amqplib';
import { PaymentData } from './types';
import { fetch } from 'undici'
import database from './database';

async function processAndSavePayment(paymentData: PaymentData): Promise<boolean> {
  try {
    const response = await processPayment(paymentData);

    if (!response) {
      console.error(`Failed to process payment ${paymentData.correlationId}`);
      return false;
    }

    await saveProcessedPayment(paymentData, response.processor);

    return true;
  } catch (error) {

    console.error(`Error processing payment ${paymentData.correlationId}:`, error);
    return false;
  }
}

export async function startWorker() {
  const { channel, queueName } = await getQueueChannel();
  console.log(`[Worker] start:::`);

  // channel.prefetch(1);

  channel.consume(queueName, async (msg: ConsumeMessage | null) => {
    if (msg) {
      const payment = JSON.parse(msg.content.toString());
      const isSuccess = await processAndSavePayment(payment);

      console.log(`payment ${payment.correlationId} is processed`, isSuccess);
      // if (isSuccess) {
      //   channel.ack(msg);
      // } else {
      //   channel.nack(msg, false, true);
      // }
    }
  }, { noAck: true });
}

const PROCESSOR_DEFAULT_URL = 'http://payment-processor-default:8080';
const PROCESSOR_FALLBACK_URL = 'http://payment-processor-fallback:8080';

async function processPayment(paymentData: PaymentData) {
  const body = {
    correlationId: paymentData.correlationId,
    amount: paymentData.amountInCents / 100,
    requestedAt: paymentData.receivedAt.toISOString()
  }

  try {
    await fetch(`${PROCESSOR_DEFAULT_URL}/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    return { success: true, processor: 'default' };
  } catch (error) {

    try {
      await fetch(`${PROCESSOR_FALLBACK_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      return { success: true, processor: 'fallback' };

    } catch (fallbackError) {

      return null;
    }
  }
}

async function saveProcessedPayment(payment: PaymentData, processor: string) {
  await database.query(`
    INSERT INTO processed_payments (correlation_id, amount, processor)
    VALUES ($1, $2, $3)
  `, [payment.correlationId, payment.amountInCents, processor]);
}
