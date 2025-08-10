import { inMemoryService } from "../services/InMemoryService";
import { redisService } from "../services/RedisService";
import type { Payment } from "../types";

export async function paymentsController(req: Request) {
  const { correlationId, amount } = await req.json() as Payment;

  inMemoryService.add({ correlationId, amount });
  // redisService.addToQueue(correlationId, amount);

  return new Response(null, { status: 202 });
}
