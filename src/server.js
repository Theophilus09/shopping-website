import 'dotenv/config';
import express from 'express';
import orderRoutes from './routes/orderRoutes.js';
import productRoutes from './routes/productRoutes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Whitelist of allowed origins
const allowedOrigins = [
    'http://localhost:5173',
    'https://shopping-frontend-ochre.vercel.app'
];

// If FRONTEND_URL is set on Render, append it dynamically
if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}

// Global CORS & Preflight Middleware
app.use((req, res, next) => {
    const origin = req.headers.origin;

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }

    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
    );
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization, apikey'
    );
    res.setHeader('Access-Control-Max-Age', '86400'); // Cache preflight for 24 hours

    // Handle OPTIONS preflight immediately
    if (req.method === 'OPTIONS') {
        return res.status(204).end();
    }

    next();
});

// Body parsers - MUST be registered before any routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root route (for health monitoring and waking up Render)
app.get('/', (req, res) => {
    res.status(200).json({ message: 'Shopping backend is running live!' });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Application routes
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);

// 404 handler for unmatched routes
app.use((req, res) => {
    res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Global error handler (ensures CORS headers remain attached during errors)
app.use((err, req, res, next) => {
    const origin = req.headers.origin;
    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    console.error('Unhandled server error:', err.stack || err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});