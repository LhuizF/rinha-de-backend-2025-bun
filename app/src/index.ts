import { redisService } from "./services/RedisService";
import { paymentService } from "./services/PaymentService";
import { startWorker } from "./worker";

const PORT = process.env.PORT || 3333;

const server = Bun.serve({
  port: PORT,
  maxRequestBodySize: 1024,
  hostname: "0.0.0.0",
  async fetch(req) {
    if (req.method === "GET" && req.url.includes("/health")) {
      return new Response(null, { status: 200 });
    }
    if (req.method === "POST" && req.url.includes("/payments")) {
      const body = await req.text()
      const { amount, correlationId } = JSON.parse(body)

      redisService.addToQueue(correlationId, amount)

      return new Response(null, { status: 202 })
    }

    if (req.method === "GET" && req.url.includes("/payments-summary")) {
      try {
        const url = new URL(req.url)
        const from = url.searchParams.get("from") || undefined
        const to = url.searchParams.get("to") || undefined

        const summary = await paymentService.getPaymentsSummary(from, to);
        console.log("==================================")
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

    if (req.method === "POST" && req.url.includes("/purge-payments")) {
      try {
        await paymentService.purgePayments();
        return new Response(JSON.stringify({ status: 'ok' }), { status: 200 })
      } catch (error) {
        return new Response("Failed to purge payments.", { status: 500 });
      }
    }

    return new Response("Not found", { status: 404 })
  },

});

console.log(`Happy happy happy: ${server.port}`)
startWorker()
