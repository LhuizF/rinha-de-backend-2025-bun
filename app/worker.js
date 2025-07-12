import axios from "axios";
import database from "./database.js";

const PROCESSOR_DEFAULT_URL = 'http://payment-processor-default:8080';
const PROCESSOR_FALLBACK_URL = 'http://payment-processor-fallback:8080';

// queue
export const paymentQueue = [];

async function processPayment(payment) {
  const body = {
    correlationId: payment.correlationId,
    amount: payment.amountInCents / 100,
    requestedAt: payment.receivedAt.toISOString()
  }

  try {
    const response = await axios.post(`${PROCESSOR_DEFAULT_URL}/payments`, body);
    console.log('Response default :::', response.data);
    workerLog(`processed - DEFAULT ${payment.correlationId}`);

    return { success: true, processor: 'default' };
  } catch (error) {

    try {
      const response = await axios.post(`${PROCESSOR_FALLBACK_URL}/payments`, body);
      console.log('Response fallback:::', response.data);
      workerLog(`processed - FALLBACK ${payment.correlationId}`);

      return { success: true, processor: 'fallback' };

    } catch (fallbackError) {

      workerLog(`${payment.correlationId} ${fallbackError.message}`, 'error');

      return { success: false };
    }
  }
}

export async function startWorker() {

  setInterval(async () => {
    if (paymentQueue.length === 0) {
      return;
    }

    const paymentToProcess = paymentQueue[0];

    const result = await processPayment(paymentToProcess);

    if (result.success) {
      paymentQueue.shift();

      try {
        await salveProcessedPayment(paymentToProcess, result.processor);

      } catch (error) {
        console.log(`Error saving payment: ${error.message}`);
      }
    }

  }, 2_000);
}


function workerLog(message, type = 'warning') {

  const colorMapping = {
    warning: '\x1b[33m',
    error: '\x1b[31m',
  };

  const color = colorMapping[type] || '\x1b[0m';

  console.log(`${color}[Worker]: ${message}\x1b[0m`);
}

async function salveProcessedPayment(payment, processor) {
  await database.query(`
    INSERT INTO processed_payments (correlationId, amount, processor)
    VALUES ($1, $2, $3)
  `, [payment.correlationId, payment.amountInCents, processor]);
}
