const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Only load dotenv in development
if (process.env.NODE_ENV !== 'production') {
    require('dotenv').config();
}

const app = express();

// Security middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files - IMPORTANT: This serves your public folder
app.use(express.static(path.join(__dirname, 'public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Import routes
const authRoutes = require('./server/routes/auth');
const walletRoutes = require('./server/routes/wallet');
const wagerRoutes = require('./server/routes/wager');
const chatRoutes = require('./server/routes/chat');
const generalRoutes = require('./server/routes/general');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wagers', wagerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/general', generalRoutes);

// Paystack webhook endpoint
app.post('/api/webhooks/paystack', express.raw({ type: 'application/json' }), (req, res) => {
    // Verify webhook signature
    const hash = require('crypto')
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Unauthorized');
    }

    // Process webhook
    const event = req.body;
    console.log('Paystack webhook:', event);
    
    // Handle different event types
    switch(event.event) {
        case 'charge.success':
            // Handle successful payment
            break;
        case 'transfer.success':
            // Handle successful withdrawal
            break;
    }

    res.status(200).send('OK');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Tété API is running',
        timestamp: new Date().toISOString(),
        endpoints: {
            auth: '/api/auth',
            wallet: '/api/wallet',
            wagers: '/api/wagers',
            chat: '/api/chat',
            general: '/api/general'
        }
    });
});

// Serve index.html for all non-API routes (IMPORTANT for single-page app behavior)
app.get('*', (req, res) => {
    // Don't serve index.html for API routes
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    
    // Check if file exists in public folder
    const filePath = path.join(__dirname, 'public', req.path);
    const fs = require('fs');
    
    // If it's a file that exists, it will be served by express.static above
    // Otherwise, serve index.html
    if (!fs.existsSync(filePath)) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// For local development only
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log(`✅ Tété server running on port ${PORT}`);
        console.log(`🌐 Visit http://localhost:${PORT}`);
        console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
        console.log(`\n🎮 Ready to handle wagers!`);
    });

    // Set up Supabase real-time (for live updates)
    const { supabaseAdmin } = require('./server/config/supabase');

    // Listen for new messages
    supabaseAdmin
        .channel('chat-messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
            (payload) => {
                console.log('New message:', payload.new);
                // In production, emit via WebSocket to connected clients
            }
        )
        .subscribe();
}

// Export for Vercel
module.exports = app;