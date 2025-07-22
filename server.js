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

// PART 1: Security and Basic Middleware
app.use(helmet({
    contentSecurityPolicy: false,
}));
app.use(cors());
app.use(compression());

// PART 2: Body Parsing and Static Files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// PART 3: View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// PART 4: Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100
});
app.use('/api/', limiter);

// PART 5: Import Route Files
const authRoutes = require('./server/routes/auth');
const walletRoutes = require('./server/routes/wallet');
const wagerRoutes = require('./server/routes/wager');
const chatRoutes = require('./server/routes/chat');
const generalRoutes = require('./server/routes/general');

// PART 6: Apply API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wagers', wagerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/general', generalRoutes);

// PART 7: Paystack Webhook
app.post('/api/webhooks/paystack', express.raw({ type: 'application/json' }), (req, res) => {
    const hash = require('crypto')
        .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
        .update(JSON.stringify(req.body))
        .digest('hex');
    
    if (hash !== req.headers['x-paystack-signature']) {
        return res.status(401).send('Unauthorized');
    }

    const event = req.body;
    console.log('Paystack webhook:', event);
    
    switch(event.event) {
        case 'charge.success':
            break;
        case 'transfer.success':
            break;
    }

    res.status(200).send('OK');
});

// PART 8: Health Check Endpoint
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

// PART 9: Catch-All Route - ALTERNATIVE VERSION
// Temporarily comment this out - we'll handle it differently
// app.get('/*', (req, res) => {
//     if (req.path.startsWith('/api')) {
//         return res.status(404).json({ error: 'API route not found' });
//     }
//     
//     res.sendFile(path.join(__dirname, 'public', 'index.html'));
// });

// PART 10: Error Handling Middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// PART 11: Server Start and Supabase
if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    const server = app.listen(PORT, () => {
        console.log(`✅ Tété server running on port ${PORT}`);
        console.log(`🌐 Visit http://localhost:${PORT}`);
        console.log(`📡 API Health: http://localhost:${PORT}/api/health`);
        console.log(`\n🎮 Ready to handle wagers!`);
    });

    // PART 11B: Supabase Real-time - COMMENTED OUT DUE TO ERROR
    
    const { supabaseAdmin } = require('./server/config/supabase');
    supabaseAdmin
        .channel('chat-messages')
        .on('postgres_changes', 
            { event: 'INSERT', schema: 'public', table: 'chat_messages' }, 
            (payload) => {
                console.log('New message:', payload.new);
            }
        )
        .subscribe();
    
}

// Export for Vercel
module.exports = app;