import { paymentService } from "../services/PaymentService";

export async function paymentsSummaryController(req: Request) {
  try {
    const url = new URL(req.url)
    const from = url.searchParams.get("from") || undefined
    const to = url.searchParams.get("to") || undefined

    const summary = await paymentService.getPaymentsSummary(from, to);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error) {
    return new Response("Failed to fetch payment summary.", { status: 500 });
  }
}
