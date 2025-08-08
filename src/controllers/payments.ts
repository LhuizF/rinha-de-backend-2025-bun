import { inMemoryService } from "../services/InMemoryService";
import type { Payment } from "../types";

export async function paymentsController(req: Request) {
  const payment = await req.json() as Payment;

  inMemoryService.add(payment);

  return new Response(null, { status: 202 });
}
