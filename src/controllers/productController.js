import { supabaseAdmin } from '../services/supabaseAdmin.js';

export const getProducts = async (req, res) => {
    try {
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const { data, error } = await supabaseAdmin
            .from('products')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};