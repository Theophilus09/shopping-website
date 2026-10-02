import { supabaseAdmin } from '../services/supabaseAdmin.js';
import { sendOrderEmail } from '../services/emailService.js';

/**
 * Handles guest and authenticated checkouts
 * Recalculates prices strictly on server-side to prevent tampering
 */
export const createOrder = async (req, res) => {
    try {
        const {
            customer_name,
            email,
            phone,
            address,
            city,
            state,
            country,
            items
        } = req.body;

        if (!customer_name || !email || !address || !items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'Missing required order details or empty cart items.' });
        }

        const productIds = items.map((i) => i.product_id || i.id);

        // 1. Fetch live product data directly from Supabase for price verification
        const { data: dbProducts, error: prodErr } = await supabaseAdmin
            .from('products')
            .select('id, name, price, stock')
            .in('id', productIds);

        if (prodErr || !dbProducts || dbProducts.length === 0) {
            console.error('Database product fetch error:', prodErr);
            return res.status(400).json({ error: 'Unable to verify items in database.' });
        }

        const productMap = new Map(dbProducts.map((p) => [p.id, p]));

        // 2. Validate inventory & calculate trusted subtotal
        let subtotal = 0;
        const verifiedOrderItems = [];

        for (const item of items) {
            const rawId = item.product_id || item.id;
            const dbProd = productMap.get(rawId);

            if (!dbProd) {
                return res.status(400).json({ error: `Product ID ${rawId} not found.` });
            }

            if (dbProd.stock < item.quantity) {
                return res.status(400).json({
                    error: `Insufficient stock for "${dbProd.name}". Available: ${dbProd.stock}`
                });
            }

            const lineTotal = Number(dbProd.price) * item.quantity;
            subtotal += lineTotal;

            verifiedOrderItems.push({
                product_id: dbProd.id,
                product_name: dbProd.name,
                price: Number(dbProd.price),
                quantity: item.quantity
            });
        }

        const shippingFee = 15.00;
        const finalTotal = Number(subtotal) + shippingFee;

        // Resolve authenticated user ID or body fallback
        const userId = req.user?.id || req.body.user_id || null;

        // 3. Insert into orders table
        const { data: newOrder, error: orderErr } = await supabaseAdmin
            .from('orders')
            .insert([
                {
                    user_id: userId,
                    customer_name,
                    email,
                    phone: phone || 'N/A',
                    address,
                    city: city || '',
                    state: state || '',
                    country: country || 'United States',
                    subtotal: Number(subtotal.toFixed(2)),
                    shipping_fee: shippingFee,
                    total: Number(finalTotal.toFixed(2)),
                    status: 'completed'
                }
            ])
            .select()
            .single();

        if (orderErr || !newOrder) {
            console.error('Order creation database error:', orderErr);
            return res.status(500).json({ error: orderErr?.message || 'Failed to record order.' });
        }

        // 4. Insert order line items
        const orderItemsPayload = verifiedOrderItems.map((item) => ({
            order_id: newOrder.id,
            product_id: item.product_id,
            product_name: item.product_name,
            price: item.price,
            quantity: item.quantity
        }));

        const { error: itemsErr } = await supabaseAdmin
            .from('order_items')
            .insert(orderItemsPayload);

        if (itemsErr) {
            console.error('Order items insertion error:', itemsErr);
        }

        // 5. Deduct inventory stock
        for (const item of verifiedOrderItems) {
            const dbProd = productMap.get(item.product_id);
            await supabaseAdmin
                .from('products')
                .update({ stock: Math.max(0, dbProd.stock - item.quantity) })
                .eq('id', item.product_id);
        }

        // 6. Dispatch transactional confirmation email via Mailgun
        try {
            await sendOrderEmail({
                to: email,
                orderId: newOrder.id,
                total: newOrder.total,
                customerName: customer_name,
                items: verifiedOrderItems.map((i) => ({
                    name: i.product_name,
                    quantity: i.quantity,
                    price: i.price
                }))
            });
        } catch (mailErr) {
            console.error('Non-blocking email dispatch failure:', mailErr?.message || mailErr);
        }

        return res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            order: newOrder
        });
    } catch (error) {
        console.error('Order processing exception:', error);
        return res.status(500).json({ error: 'Server error processing order.' });
    }
};

/**
 * Retrieves orders belonging to the authenticated customer
 */
export const getUserOrders = async (req, res) => {
    try {
        const userId = req.user?.id;
        const userEmail = req.user?.email;

        if (!userId && !userEmail) {
            return res.status(401).json({ error: 'Unauthorized: User identity not found.' });
        }

        let query = supabaseAdmin.from('orders').select('*');

        if (userId && userEmail) {
            query = query.or(`user_id.eq.${userId},email.eq.${userEmail}`);
        } else if (userId) {
            query = query.eq('user_id', userId);
        } else {
            query = query.eq('email', userEmail);
        }

        const { data: orders, error } = await query.order('created_at', { ascending: false });

        if (error) {
            console.error('[getUserOrders] Database error:', error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json(orders || []);
    } catch (err) {
        console.error('[getUserOrders] Exception:', err);
        return res.status(500).json({ error: 'Server error fetching orders.' });
    }
};