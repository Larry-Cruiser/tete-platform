const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const paystackService = require('../services/paystackService');

// Get categories
router.get('/categories', async (req, res) => {
    try {
        const { data: categories, error } = await supabaseAdmin
            .from('wager_categories')
            .select(`
                *,
                wager_subcategories(*)
            `)
            .eq('is_active', true)
            .order('display_order');

        if (error) {
            return res.status(500).json({ error: 'Failed to fetch categories' });
        }

        res.json({ categories });
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get banks
router.get('/banks', async (req, res) => {
    try {
        const banks = await paystackService.getBanks();
        
        if (!banks.status) {
            return res.status(500).json({ error: 'Failed to fetch banks' });
        }

        res.json({ banks: banks.data });
    } catch (error) {
        console.error('Get banks error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get platform stats
router.get('/stats', async (req, res) => {
    try {
        const { data: totalUsers } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true });

        const { data: activeWagers } = await supabaseAdmin
            .from('wagers')
            .select('id', { count: 'exact', head: true })
            .in('status', ['open', 'in_progress']);

        const { data: totalWagers } = await supabaseAdmin
            .from('wagers')
            .select('amount')
            .eq('status', 'completed');

        const totalVolume = totalWagers?.reduce((sum, w) => sum + parseFloat(w.amount), 0) || 0;

        res.json({
            stats: {
                totalUsers: totalUsers || 0,
                activeWagers: activeWagers || 0,
                totalVolume: totalVolume * 2, // Both sides of wagers
                platformCurrency: 'NGN'
            }
        });
    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;