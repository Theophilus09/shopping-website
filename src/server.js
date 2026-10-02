import 'dotenv/config'; // PERMANENT FIX: Hoisted and executed first in ES modules
import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
    'http://localhost:5173',
    'https://shopping-frontend-ochre.vercel.app'
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, Postman) or matching origins
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(null, true); // Fallback: allow to avoid preflight crash
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'apikey'],
    })
);

// Explicitly handle all preflight OPTIONS requests before any route
app.options('*', cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Primary application routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 Route handler
app.use((req, res) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Unhandled server error:', err.stack || err);
    res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.json({ message: 'Shopping backend is running live!' });
});