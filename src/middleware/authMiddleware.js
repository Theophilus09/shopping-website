import { supabaseAdmin } from '../services/supabaseAdmin.js';

export const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.user = null;
        return next();
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);
        if (!error && data?.user) {
            req.user = data.user;
            console.log('[optionalAuth] Authenticated user:', req.user.email, req.user.id);
        } else {
            console.warn('[optionalAuth] Token verification failed:', error?.message);
            req.user = null;
        }
    } catch (err) {
        console.warn('[optionalAuth] Exception:', err.message);
        req.user = null;
    }

    next();
};

export const requireAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing Bearer token' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const { data, error } = await supabaseAdmin.auth.getUser(token);

        if (error || !data?.user) {
            console.error('[requireAuth] Verification error:', error?.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        req.user = data.user;
        console.log('[requireAuth] Verified user:', req.user.email);
        next();
    } catch (err) {
        console.error('[requireAuth] Exception:', err);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};