import express from 'express';
import { paymentQueue, startWorker } from './worker.js';
import database from './database.js';

const app = express();
app.use(express.json());

app.post('/payments', (req, res) => {
  const { correlationId, amount } = req.body;

  if (!correlationId || typeof correlationId !== 'string') {
    return res.status(400).json({ error: 'correlationId is not valid.' });
  }
  if (!amount || typeof amount !== 'number' || amount <= 0) {
    return res.status(400).json({ error: 'amount is not valid.' });
  }

  const payment = {
    correlationId,
    amountInCents: Math.round(amount * 100),
    receivedAt: new Date()
  };

  paymentQueue.push(payment);

  res.status(202).json({ status: 'ok' });
});

app.get('/payments-summary', async (req, res) => {
  const { from, to } = req.query;

  try {
    let query = `
            SELECT
                processor,
                COUNT(*) AS "totalRequests",
                SUM(amount) AS "totalAmount"
            FROM
                processed_payments
        `;

    const params = [];
    if (from && to) {
      query += ' WHERE processed_at BETWEEN $1 AND $2';
      params.push(from, to);
    } else if (from) {
      query += ' WHERE processed_at >= $1';
      params.push(from);
    } else if (to) {
      query += ' WHERE processed_at <= $1';
      params.push(to);
    }

    query += ' GROUP BY processor;';

    const { rows } = await database.query(query, params);

    const summary = {
      default: {
        totalRequests: 0,
        totalAmount: 0
      },
      fallback: {
        totalRequests: 0,
        totalAmount: 0
      }
    };

    for (const row of rows) {
      if (row.processor === 'default' || row.processor === 'fallback') {

        summary[row.processor].totalRequests = parseInt(row.totalRequests, 10);
        summary[row.processor].totalAmount = parseFloat(row.totalAmount) / 100;
      }
    }

    res.status(200).json(summary);

  } catch (error) {

    res.status(500).json({ error: 'Failed to fetch payment summary.' });
  }
});

app.post('/purge-payments', async (req, res) => {
  try {
    await database.query('DELETE FROM processed_payments;');
    res.status(200).json({ status: 'ok' });
  } catch (error) {

    res.status(500).json({ error: 'Failed to purge payments.' });
  }
});

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  startWorker()
  console.log(`Server is running on port ${PORT}`);
})
