import express from 'express';
import routes from './routes/index.js';
import cors from 'cors';
import { notFound } from './middlewares/notFound.js';
import { globalError } from './middlewares/globalError.js';
import { stripeWebhook } from './modules/payment/payment.controller.js';

const app = express();

app.use(express.json());

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || "*",
}));

app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);


app.get('/', (req, res) => {
    res.send("Api is running...")
})


app.use('/api/v1', routes);

app.use(notFound);
app.use(globalError);



export default app;
