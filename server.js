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
// IMPORTANT: express.json() must come BEFORE routes that need JSON parsing
// But express.raw() for webhooks needs to be specific
app.use((req, res, next) => {
    // Skip JSON parsing for webhook endpoint
    if (req.path === '/api/webhooks/paystack') {
        next();
    } else {
        express.json()(req, res, next);
    }
});
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
const adminRoutes = require('./server/routes/admin');

// Import Supabase for webhook processing
const { supabaseAdmin } = require('./server/config/supabase');

// PART 6: Apply API Routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/wagers', wagerRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/general', generalRoutes);
app.use('/api/admin', adminRoutes);

// PART 7: Paystack Webhook - COMPLETE VERSION
app.post('/api/webhooks/paystack', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
        // Verify webhook signature
        const crypto = require('crypto');
        const hash = crypto
            .createHmac('sha512', process.env.PAYSTACK_SECRET_KEY)
            .update(req.body)
            .digest('hex');
        
        if (hash !== req.headers['x-paystack-signature']) {
            console.log('Invalid webhook signature');
            return res.status(401).send('Unauthorized');
        }

        // Parse the body since we received it as raw
        const event = JSON.parse(req.body.toString());
        console.log('Paystack webhook event:', event.event);
        
        switch(event.event) {
            case 'charge.success':
                // Handle successful payment
                await handleSuccessfulPayment(event.data);
                break;
                
            case 'transfer.success':
                // Handle successful withdrawal
                await handleSuccessfulTransfer(event.data);
                break;
                
            case 'transfer.failed':
            case 'transfer.reversed':
                // Handle failed withdrawal
                await handleFailedTransfer(event.data);
                break;
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Webhook processing error:', error);
        res.status(500).send('Webhook processing failed');
    }
});

// Helper function to handle successful payments
async function handleSuccessfulPayment(data) {
    try {
        const reference = data.reference;
        const amount = data.amount / 100; // Convert from kobo to naira
        
        console.log(`Processing successful payment: ${reference}, Amount: ₦${amount}`);
        
        // Get the pending transaction
        const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('paystack_reference', reference)
            .eq('status', 'pending')
            .single();

        if (txError || !transaction) {
            console.error('Transaction not found:', reference);
            return;
        }

        // Get user's wallet
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('*')
            .eq('user_id', transaction.user_id)
            .single();

        if (walletError || !wallet) {
            console.error('Wallet not found for user:', transaction.user_id);
            return;
        }

        // Calculate new balance
        const newBalance = parseFloat(wallet.balance) + amount;

        // Update wallet balance
        const { error: updateWalletError } = await supabaseAdmin
            .from('wallets')
            .update({
                balance: newBalance,
                total_deposited: parseFloat(wallet.total_deposited || 0) + amount,
                updated_at: new Date().toISOString()
            })
            .eq('id', wallet.id);

        if (updateWalletError) {
            console.error('Failed to update wallet:', updateWalletError);
            return;
        }

        // Update transaction status
        const { error: updateTxError } = await supabaseAdmin
            .from('transactions')
            .update({
                status: 'completed',
                balance_after: newBalance,
                completed_at: new Date().toISOString()
            })
            .eq('id', transaction.id);

        if (updateTxError) {
            console.error('Failed to update transaction:', updateTxError);
            return;
        }

        console.log(`✅ Payment processed successfully: ${reference}`);
        
        // Create notification for user (optional)
        await supabaseAdmin
            .from('notifications')
            .insert({
                user_id: transaction.user_id,
                title: 'Deposit Successful',
                message: `Your deposit of ₦${amount.toLocaleString()} has been credited to your wallet.`,
                type: 'success'
            });

    } catch (error) {
        console.error('Error handling successful payment:', error);
    }
}

// Helper function to handle successful transfers (withdrawals)
async function handleSuccessfulTransfer(data) {
    try {
        const reference = data.reference;
        console.log(`Processing successful transfer: ${reference}`);
        
        // Update transaction status to completed
        const { error } = await supabaseAdmin
            .from('transactions')
            .update({
                status: 'completed',
                completed_at: new Date().toISOString()
            })
            .eq('reference', reference)
            .eq('status', 'pending');

        if (error) {
            console.error('Failed to update transfer transaction:', error);
        }
        
        console.log(`✅ Transfer processed successfully: ${reference}`);
    } catch (error) {
        console.error('Error handling successful transfer:', error);
    }
}

// Helper function to handle failed transfers
async function handleFailedTransfer(data) {
    try {
        const reference = data.reference;
        console.log(`Processing failed transfer: ${reference}`);
        
        // Get the transaction
        const { data: transaction, error: txError } = await supabaseAdmin
            .from('transactions')
            .select('*')
            .eq('reference', reference)
            .single();

        if (txError || !transaction) {
            console.error('Transaction not found:', reference);
            return;
        }

        // Refund the amount back to wallet
        const { data: wallet, error: walletError } = await supabaseAdmin
            .from('wallets')
            .select('*')
            .eq('user_id', transaction.user_id)
            .single();

        if (!walletError && wallet) {
            const refundedBalance = parseFloat(wallet.balance) + parseFloat(transaction.amount);
            
            await supabaseAdmin
                .from('wallets')
                .update({
                    balance: refundedBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);
        }

        // Update transaction status
        await supabaseAdmin
            .from('transactions')
            .update({
                status: 'failed',
                completed_at: new Date().toISOString()
            })
            .eq('reference', reference);

        console.log(`❌ Transfer failed and refunded: ${reference}`);
    } catch (error) {
        console.error('Error handling failed transfer:', error);
    }
}

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

// PART 9: Catch-All Route - WORKING VERSION
// Handle all other routes by serving index.html
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ error: 'API route not found' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

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

    // PART 11B: Supabase Real-time
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