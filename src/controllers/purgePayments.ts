import { redisService } from "../services/RedisService";

export async function purgePaymentsController() {
  try {
    await redisService.cleanUpPayments()
    return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
  } catch (error) {
    return new Response("Failed to purge payments.", { status: 500 });
  }
}
