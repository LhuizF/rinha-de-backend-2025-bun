import express from 'express';
import { Pool } from 'pg';

const app = express();

const pool = new Pool({
  user: 'admin',
  password: 'password',
  database: 'rinha-de-backend',
  host: process.env.DATABASE_HOST || 'localhost',
  port: 5432,
});

app.get('/', async (req, res) => {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();

    res.status(200).send('Conectado ao banco de dados com sucesso!');
  } catch (error) {

    console.error('Erro ao conectar ao banco de dados!', error);
    res.status(500).send('Erro ao conectar ao banco de dados!');
  }
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
})

