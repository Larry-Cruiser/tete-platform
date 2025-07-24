const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const paystackService = require('../services/paystackService');

// Get categories with subcategories
router.get('/categories', async (req, res) => {
    try {
        console.log('🎯 Fetching categories from database...');
        
        // Get all categories - FIXED: Remove the .eq('active', true) filter for now
        const { data: categories, error: catError } = await supabaseAdmin
            .from('wager_categories')
            .select('*')
            .order('name');

        if (catError) {
            console.error('Categories error:', catError);
            throw catError;
        }

        console.log('✅ Categories fetched:', categories?.length || 0);

        // Get all subcategories - FIXED: Remove the .eq('active', true) filter for now
        const { data: subcategories, error: subError } = await supabaseAdmin
            .from('wager_subcategories')
            .select('*')
            .order('name');

        if (subError) {
            console.error('Subcategories error:', subError);
            throw subError;
        }

        console.log('✅ Subcategories fetched:', subcategories?.length || 0);

        // Group subcategories by category
        const categoriesWithSubs = categories.map(cat => ({
            ...cat,
            subcategories: subcategories.filter(sub => sub.category_id === cat.id)
        }));

        console.log('✅ Sending response with', categoriesWithSubs.length, 'categories');

        res.json({ categories: categoriesWithSubs });
    } catch (error) {
        console.error('❌ Get categories error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch categories',
            details: error.message 
        });
    }
});

// Get banks
router.get('/banks', async (req, res) => {
    try {
        const banks = await paystackService.getBanks();
        
        if (!banks.status) {
            return res.status(500).json({ error: 'Failed to fetch banks' });
        }

        // Sort banks alphabetically by name
        const sortedBanks = banks.data.sort((a, b) => a.name.localeCompare(b.name));

        res.json({ banks: sortedBanks });
    } catch (error) {
        console.error('Get banks error:', error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get platform stats
router.get('/stats', async (req, res) => {
    try {
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('id', { count: 'exact', head: true });

        const { count: activeWagers } = await supabaseAdmin
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