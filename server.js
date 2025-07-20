const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

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

// Static files
app.use(express.static('public'));

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

// Basic route for testing
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Tété - Coming Soon</title>
            <style>
                body {
                    background-color: #1a1a1a;
                    color: #FFFFFF;
                    font-family: Arial, sans-serif;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    height: 100vh;
                    margin: 0;
                }
                .container {
                    text-align: center;
                    padding: 40px;
                    border: 3px solid #FFD700;
                    border-radius: 15px;
                    background: rgba(26, 26, 26, 0.9);
                    box-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
                }
                h1 {
                    font-size: 4em;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                    margin-bottom: 20px;
                    color: #FFFFFF;
                }
                .accent {
                    color: #FF4500;
                }
                .status {
                    color: #90EE90;
                    font-size: 1.2em;
                    margin: 20px 0;
                }
                .gold-text {
                    color: #FFD700;
                    font-weight: bold;
                }
                .endpoints {
                    margin-top: 30px;
                    text-align: left;
                    background: rgba(0,0,0,0.5);
                    padding: 20px;
                    border-radius: 10px;
                    border: 1px solid #FFD700;
                }
                .endpoints h3 {
                    color: #FFD700;
                    margin-bottom: 10px;
                }
                .endpoints ul {
                    list-style: none;
                    padding: 0;
                }
                .endpoints li {
                    color: #B0B0B0;
                    margin: 5px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>Tété Platform</h1>
                <p class="accent">Players win, we just host! 🎮</p>
                <p class="status">✅ Backend API is fully operational</p>
                <p class="gold-text">Premium P2P Betting Experience</p>
                
                <div class="endpoints">
                    <h3>API Endpoints Ready:</h3>
                    <ul>
                        <li>✓ Authentication System</li>
                        <li>✓ Wallet Management</li>
                        <li>✓ Wager Creation & Joining</li>
                        <li>✓ Real-time Chat</li>
                        <li>✓ Payment Integration</li>
                    </ul>
                </div>
            </div>
        </body>
        </html>
    `);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ 
        error: 'Something went wrong!',
        message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server with real-time support
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

module.exports = server;