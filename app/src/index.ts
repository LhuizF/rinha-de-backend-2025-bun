import { Elysia, t } from "elysia";
import { redisService } from "./services/RedisService";
import { startWorker } from "./worker";
import { paymentService } from "./services/PaymentService";

const app = new Elysia()

app.post('/payments', (ctx) => {
  const { correlationId, amount } = ctx.body;

  if (!correlationId) {
    ctx.set.status = 400;
    return { error: 'correlationId is not valid.' }
  }

  if (!amount) {
    ctx.set.status = 400;
    return { error: 'amount is not valid.' }
  }

  redisService.addToQueue(correlationId, amount);

  ctx.set.status = 202
  return { status: 'ok' }
}, {
  body: t.Object({
    correlationId: t.String(),
    amount: t.Number()
  })
})

app.get('/payments-summary', async (ctx) => {
  const { from, to } = ctx.query;

  try {
    const summary = await paymentService.getPaymentsSummary(from, to);

    ctx.set.status = 200
    return summary;

  } catch (error) {

    ctx.set.status = 500;
    return { error: 'Failed to fetch payment summary.' };
  }
});

app.post('/purge-payments', async (ctx) => {

  await paymentService.purgePayments();

  ctx.set.status = 200
  return { status: 'ok' };
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
  startWorker()
});
