const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Admin login
router.post('/login', async (req, res) => {
    try {
        const { email, password, code } = req.body;
        
        // For now, accept your hardcoded credentials
        if (email === 'tete.lanre@gmail.com' && 
            password === '@@@Info@@@123*Admin' && 
            code === '030401') {
            
            const token = jwt.sign(
                { adminId: '1', email: email },
                process.env.JWT_SECRET || 'your-secret-key',
                { expiresIn: '8h' }
            );

            res.json({
                token,
                admin: {
                    id: '1',
                    email: email,
                    name: 'Admin User',
                    role: 'super_admin'
                }
            });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Dashboard stats - this will show your real data
router.get('/dashboard/stats', async (req, res) => {
    try {
        // Get total users
        const { count: totalUsers } = await supabaseAdmin
            .from('users')
            .select('*', { count: 'exact', head: true });

        // Get active wagers
        const { count: activeWagers } = await supabaseAdmin
            .from('wagers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'in_progress');

        // Get pending disputes
        const { count: pendingDisputes } = await supabaseAdmin
            .from('wagers')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'in_dispute');

        res.json({
            totalUsers: totalUsers || 0,
            activeWagers: activeWagers || 0,
            totalRevenue: 0, // We'll calculate this later
            pendingDisputes: pendingDisputes || 0,
            recentActivity: [] // We'll add this later
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Get all users
router.get('/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search = '', status = '' } = req.query;
        const offset = (page - 1) * limit;

        let query = supabaseAdmin
            .from('users')
            .select(`
                *,
                wallets (
                    id,
                    balance,
                    locked_balance
                )
            `, { count: 'exact' });

        // Apply filters
        if (search) {
            query = query.or(`username.ilike.%${search}%,email.ilike.%${search}%`);
        }
        if (status) {
            query = query.eq('status', status);
        }

        // Get paginated results
        const { data: users, count, error } = await query
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        console.log('Sample user with wallet:', users[0]); // Debug log

        res.json({
            users: users || [],
            total: count || 0,
            page: parseInt(page),
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Suspend/unsuspend user
router.post('/users/:userId/suspend', async (req, res) => {
    try {
        const { userId } = req.params;
        const { action, reason } = req.body;

        const newStatus = action === 'suspend' ? 'suspended' : 'active';

        const { error } = await supabaseAdmin
            .from('users')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId);

        if (error) throw error;

        res.json({ success: true, message: `User ${action}ed successfully` });
    } catch (error) {
        console.error('Suspend user error:', error);
        res.status(500).json({ error: 'Failed to update user status' });
    }
});
module.exports = router;