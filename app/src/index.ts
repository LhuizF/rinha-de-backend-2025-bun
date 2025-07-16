import { Elysia, t } from "elysia";
import { addPaymentToQueue } from "./queue";
import { startWorker } from "./worker";
import database from "./database";

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

  addPaymentToQueue({ correlationId, amount });

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
    const summary = await getPaymentSummaryFromDB(from, to);

    ctx.set.status = 200
    return summary;

  } catch (error) {

    ctx.set.status = 500;
    return { error: 'Failed to fetch payment summary.' };
  }
});

app.post('/purge-payments', async () => {
  try {
    await database.query('DELETE FROM processed_payments;');
    return { status: 'ok' };
  } catch (error) {

    return { error: 'Failed to purge payments.' }
  }
});


const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
  );
  startWorker();
});

async function getPaymentSummaryFromDB(from?: string, to?: string) {
  let query = `
        SELECT
            processor,
            COUNT(*) AS "totalRequests",
            SUM(amount) AS "totalAmount"
        FROM
            processed_payments`

  const params = [];
  if (from && to) {
    query += ' WHERE processed_at BETWEEN $1 AND $2'
    params.push(from, to);
  } else if (from) {
    query += ' WHERE processed_at >= $1'
    params.push(from);
  } else if (to) {
    query += ' WHERE processed_at <= $1'
    params.push(to);
  }

  query += ' GROUP BY processor;';

  const { rows } = await database.query(query, params);

  const summary = {
    default: { totalRequests: 0, totalAmount: 0 },
    fallback: { totalRequests: 0, totalAmount: 0 }
  };

  for (const row of rows) {
    const processor = row.processor as 'default' | 'fallback';
    if (summary[processor]) {
      summary[processor].totalRequests = parseInt(row.totalRequests, 10);
      summary[processor].totalAmount = parseFloat(row.totalAmount) / 100;
    }
  }

  return summary;
}
