const jwt = require('jsonwebtoken');
const { supabaseAdmin } = require('../config/supabase');

const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get user from database
        const { data: user, error } = await supabaseAdmin
            .from('users')
            .select('*, wallets(*)')
            .eq('id', decoded.userId)
            .single();

        if (error || !user) {
            return res.status(401).json({ error: 'User not found' });
        }

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is not active' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

const adminAuthMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Get admin user from database
        const { data: admin, error } = await supabaseAdmin
            .from('admin_users')
            .select('*')
            .eq('id', decoded.adminId)
            .eq('is_active', true)
            .single();

        if (error || !admin) {
            return res.status(401).json({ error: 'Admin not found' });
        }

        req.admin = admin;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid admin token' });
    }
};

module.exports = {
    authMiddleware,
    adminAuthMiddleware
};