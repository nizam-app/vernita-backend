import express from 'express';
import helmet from 'helmet';
import routes from './routes/index.js';
import cors from 'cors';
import { notFound } from './middlewares/notFound.js';
import { globalError } from './middlewares/globalError.js';
import { stripeWebhook } from './modules/payment/payment.controller.js';

const app = express();

app.use(helmet());

app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",").map((o) => o.trim()).filter(Boolean) || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// Stripe webhook needs raw body — must be registered before express.json()
app.post('/api/v1/payments/webhook', express.raw({ type: 'application/json' }), stripeWebhook);

app.use(express.json());


app.get('/', (req, res) => {
    res.send("Api is running...")
})

app.get('/api/v1/health', (req, res) => {
    res.json({ status: "ok", message: "API is running smoothly." });
})


app.use('/api/v1', routes);

app.use(notFound);
app.use(globalError);



export default app;
