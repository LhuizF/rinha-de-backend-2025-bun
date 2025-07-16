import { getQueueChannel } from './queue';
import { ConsumeMessage } from 'amqplib';

async function processAndSavePayment(paymentData: any): Promise<boolean> {
  return true;
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
