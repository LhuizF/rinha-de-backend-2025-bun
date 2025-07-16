import { Elysia, t } from "elysia";
import { addPaymentToQueue } from "./queue";
import { startWorker } from "./worker";

const PORT = process.env.PORT || 3333;

const app = new Elysia().listen(PORT, () => {
  startWorker();
})

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

  addPaymentToQueue({ correlationId, amount });

  ctx.set.status = 202
  return { status: 'ok' }
}, {
  body: t.Object({
    correlationId: t.String(),
    amount: t.Number()
  })
})

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);


interface Payment {
  correlationId: string;
  amountInCents: number;
}
