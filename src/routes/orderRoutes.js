import express from 'express';
import { createOrder, getUserOrders } from '../controllers/orderController.js';
import { optionalAuth, requireAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/orders (Guest or Authenticated checkout)
router.post('/', optionalAuth, createOrder);

// GET /api/orders (Authenticated user's order history)
router.get('/', requireAuth, getUserOrders);

export default router;