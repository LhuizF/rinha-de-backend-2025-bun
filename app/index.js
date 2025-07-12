import express from 'express';
import { paymentQueue, startWorker } from './worker.js';

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

const PORT = process.env.PORT || 3333;

app.listen(PORT, () => {
  startWorker()
  console.log(`Server is running on port ${PORT}`);
})
