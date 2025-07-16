import amqp, { Channel } from 'amqplib';
import { Payment, PaymentData } from './types';

const RABBITMQ_URL = 'amqp://admin:password@rabbitmq:5672';
const QUEUE_NAME = 'PAYMENT_PROCESSING_QUEUE'

let channel: Channel | null = null;

interface QueueConnection {
  channel: Channel;
  queueName: string;
}

export async function getQueueChannel(): Promise<QueueConnection> {
  if (channel) {
    return { channel, queueName: QUEUE_NAME };
  }

  try {
    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    await channel.assertQueue(QUEUE_NAME, { durable: true });

    return { channel, queueName: QUEUE_NAME };
  } catch (error) {
    console.error('[Queue] Erro ao conectar ao RabbitMQ:', error);
    throw new Error('Failed to connect to RabbitMQ');
  }
}

export async function addPaymentToQueue(payment: Payment): Promise<void> {
  const { channel, queueName } = await getQueueChannel();

  const paymentMessage: string = JSON.stringify({
    correlationId: payment.correlationId,
    amountInCents: Math.round(payment.amount * 100),
    receivedAt: new Date()
  } as PaymentData);


  channel.sendToQueue(queueName, Buffer.from(paymentMessage), {
    persistent: true,
  });

  console.log(`[Queue] Payment added to queue: ${payment.correlationId}`);

}
