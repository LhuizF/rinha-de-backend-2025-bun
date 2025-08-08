import { paymentService } from "../services/PaymentService";

export async function purgePaymentsController() {
  try {
    await paymentService.purgePayments();
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (error) {
    return new Response("Failed to purge payments.", { status: 500 });
  }
}
