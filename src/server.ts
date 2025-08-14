import fs from 'fs';
import { paymentsController } from './controllers/payments'
import { paymentsSummaryController } from './controllers/paymentsSummary'
import { purgePaymentsController } from './controllers/purgePayments'

export function startServer(socketPath: string) {
  if (fs.existsSync(socketPath)) {
    fs.unlinkSync(socketPath);
  }

  Bun.serve({
    unix: socketPath,
    maxRequestBodySize: 1024,
    fetch(req) {
      if (req.method === "GET" && req.url.includes("/health")) {
        return new Response(null, { status: 200 });
      }

      if (req.method === "POST" && req.url.includes("/payments")) {
        return paymentsController(req)
      }

      if (req.method === "GET" && req.url.includes("/payments-summary")) {
        return paymentsSummaryController(req);
      }

      if (req.method === "POST" && req.url.includes("/purge-payments")) {
        return purgePaymentsController();
      }

      return new Response("Not found", { status: 404 })
    }
  })

  // console.log(`Happy happy happy: ${socketPath} 1.6.0`)
}
