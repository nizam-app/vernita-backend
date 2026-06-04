import express from 'express';
import helmet from 'helmet';
import routes from './routes/index.js';
import cors from 'cors';
import { notFound } from './middlewares/notFound.js';
import { globalError } from './middlewares/globalError.js';
import { stripeWebhook } from './modules/payment/payment.controller.js';

const app = express();

app.use(helmet());

// Configure CORS with environment-driven allow-list and credentials support
const rawAllowed = process.env.ALLOWED_ORIGINS || process.env.CORS_ALLOWED_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:3000,https://verdant-kitten-0dd587.netlify.app';
const allowedOrigins = rawAllowed.split(',').map((o) => o.trim()).filter(Boolean);
const allowCredentials = true;

app.use(cors({
  origin: (origin, callback) => {
    // If no origin (e.g., same-origin or curl), allow
    if (!origin) return callback(null, true);

    // If wildcard is configured and credentials are not used, allow all
    if (allowedOrigins.includes('*') && !allowCredentials) return callback(null, true);

    // If wildcard is configured but credentials are used, reflect origin
    if (allowedOrigins.includes('*') && allowCredentials) return callback(null, true);

    // Otherwise allow only if origin is in the allow-list
    if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);

    // Not allowed
    return callback(new Error('Not allowed by CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', '*'],
  credentials: allowCredentials,
  optionsSuccessStatus: 200,
  preflightContinue: false,
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
