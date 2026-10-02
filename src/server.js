import 'dotenv/config'; // PERMANENT FIX: Hoisted and executed first in ES modules
import express from 'express';
import cors from 'cors';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Permanent bulletproof CORS middleware
app.use((req, res, next) => {
    const allowedOrigins = [
        'http://localhost:5173',
        'https://shopping-frontend-ochre.vercel.app'
    ];

    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
        // Allow for testing / fallback
        res.setHeader('Access-Control-Allow-Origin', '*');
    }

    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey'
    );

    // Instantly resolve browser preflight OPTIONS checks
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }

    next();
});

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