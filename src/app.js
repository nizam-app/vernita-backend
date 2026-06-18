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

const checkoutRedirectPage = (title, message) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; min-height: 100vh; display: grid; place-items: center; background: #f8fafc; color: #0f172a; }
    main { text-align: center; padding: 24px; }
    h1 { font-size: 1.5rem; margin-bottom: 0.5rem; }
    p { color: #475569; }
  </style>
</head>
<body>
  <main>
    <h1>${title}</h1>
    <p>${message}</p>
  </main>
</body>
</html>`;

app.get('/courses/:id/success', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment successful', 'You can return to the Vernita app.'));
});

app.get('/courses/:id/cancel', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment canceled', 'You can return to the Vernita app.'));
});

app.get('/webinars/:id/success', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment successful', 'You can return to the Vernita app.'));
});

app.get('/webinars/:id/cancel', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment canceled', 'You can return to the Vernita app.'));
});

app.get('/billing/success', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment successful', 'You can return to the Vernita app.'));
});

app.get('/billing/cancel', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment canceled', 'You can return to the Vernita app.'));
});

app.get('/payment/success', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment successful', 'You can return to the Vernita app.'));
});

app.get('/payment/cancel', (req, res) => {
  res.status(200).send(checkoutRedirectPage('Payment canceled', 'You can return to the Vernita app.'));
});

app.get('/api/v1/health', (req, res) => {
    res.json({ status: "ok", message: "API is running smoothly." });
})


app.use('/api/v1', routes);

app.use(notFound);
app.use(globalError);



export default app;
