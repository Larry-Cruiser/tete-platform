const { supabaseAdmin } = require('../config/supabase');
const paystackService = require('../services/paystackService');

class WalletController {
    async getBalance(req, res) {
        try {
            const userId = req.user.id;

            // First check if wallet exists
            let { data: wallet, error } = await supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            // If wallet doesn't exist, create it
            if (error && error.code === 'PGRST116') { // Not found error
                const { data: newWallet, error: createError } = await supabaseAdmin
                    .from('wallets')
                    .insert({
                        user_id: userId,
                        balance: 0,
                        total_deposited: 0,
                        total_withdrawn: 0
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Failed to create wallet:', createError);
                    return res.status(500).json({ error: 'Failed to create wallet' });
                }

                wallet = newWallet;
            } else if (error) {
                return res.status(500).json({ error: 'Database error' });
            }

            res.json({ wallet });

        } catch (error) {
            console.error('Get balance error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async initiateDeposit(req, res) {
        try {
            const userId = req.user.id;
            const { amount } = req.body;

            if (amount < 100) {
                return res.status(400).json({ 
                    error: 'Minimum deposit amount is ₦100' 
                });
            }

            // First get the user's wallet
            const { data: wallet, error: walletError } = await supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (walletError) {
                return res.status(404).json({ error: 'Wallet not found' });
            }

            // Create transaction reference
            const reference = `DEP-${userId}-${Date.now()}`;

            // Initialize Paystack transaction
            const paystackResponse = await paystackService.initializeTransaction({
                email: req.user.email,
                amount: amount * 100, // Convert to kobo
                reference,
                callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
                metadata: {
                    userId,
                    type: 'deposit'
                }
            });

            if (!paystackResponse.status) {
                return res.status(400).json({ 
                    error: 'Failed to initialize payment' 
                });
            }

            // Create pending transaction
            await supabaseAdmin
                .from('transactions')
                .insert({
                    user_id: userId,
                    wallet_id: wallet.id,
                    type: 'deposit',
                    amount,
                    status: 'pending',
                    reference,
                    paystack_reference: paystackResponse.data.reference,
                    balance_before: wallet.balance,
                    balance_after: wallet.balance
                });

            res.json({
                message: 'Payment initialized',
                authorization_url: paystackResponse.data.authorization_url,
                reference: paystackResponse.data.reference
            });

        } catch (error) {
            console.error('Deposit error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async verifyDeposit(req, res) {
        try {
            const { reference } = req.body;

            // Verify with Paystack
            const verification = await paystackService.verifyTransaction(reference);

            if (!verification.status || verification.data.status !== 'success') {
                return res.status(400).json({ error: 'Payment verification failed' });
            }

            // Get transaction
            const { data: transaction, error: txError } = await supabaseAdmin
                .from('transactions')
                .select('*')
                .eq('reference', reference)
                .eq('status', 'pending')
                .single();

            if (txError || !transaction) {
                return res.status(404).json({ error: 'Transaction not found' });
            }

            // Start a transaction to update wallet and transaction
            const amount = verification.data.amount / 100; // Convert from kobo

            // Update wallet balance
            const { data: wallet, error: walletError } = await supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('user_id', transaction.user_id)
                .single();

            if (walletError) {
                return res.status(500).json({ error: 'Wallet update failed' });
            }

            const newBalance = parseFloat(wallet.balance) + amount;

            // Update wallet
            await supabaseAdmin
                .from('wallets')
                .update({
                    balance: newBalance,
                    total_deposited: parseFloat(wallet.total_deposited) + amount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            // Update transaction
            await supabaseAdmin
                .from('transactions')
                .update({
                    status: 'completed',
                    balance_after: newBalance,
                    completed_at: new Date().toISOString()
                })
                .eq('id', transaction.id);

            res.json({
                message: 'Deposit successful',
                amount,
                newBalance
            });

        } catch (error) {
            console.error('Verify deposit error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async initiateWithdrawal(req, res) {
        try {
            const userId = req.user.id;
            const { amount } = req.body;
            
            // Get the user's wallet first
            const { data: wallet, error: walletError } = await supabaseAdmin
                .from('wallets')
                .select('*')
                .eq('user_id', userId)
                .single();

            if (walletError) {
                return res.status(404).json({ error: 'Wallet not found' });
            }

            // Validations
            if (amount < 1000) {
                return res.status(400).json({ 
                    error: 'Minimum withdrawal amount is ₦1,000' 
                });
            }

            if (parseFloat(wallet.balance) < amount) {
                return res.status(400).json({ 
                    error: 'Insufficient balance' 
                });
            }

            if (!req.user.bank_account_number || !req.user.bank_name) {
                return res.status(400).json({ 
                    error: 'Please complete your bank details in your profile' 
                });
            }

            // Create recipient on Paystack
            const recipient = await paystackService.createRecipient({
                name: `${req.user.first_name} ${req.user.last_name}`,
                account_number: req.user.bank_account_number,
                bank_code: req.user.bank_name // This should be bank code
            });

            if (!recipient.status) {
                return res.status(400).json({ 
                    error: 'Failed to create payment recipient' 
                });
            }

            // Initiate transfer
            const reference = `WTH-${userId}-${Date.now()}`;
            const transfer = await paystackService.initiateTransfer({
                recipient: recipient.data.recipient_code,
                amount: amount * 100, // Convert to kobo
                reference,
                reason: 'Tété wallet withdrawal'
            });

            if (!transfer.status) {
                return res.status(400).json({ 
                    error: 'Failed to initiate withdrawal' 
                });
            }

            // Deduct from wallet immediately
            const newBalance = parseFloat(wallet.balance) - amount;

            await supabaseAdmin
                .from('wallets')
                .update({
                    balance: newBalance,
                    updated_at: new Date().toISOString()
                })
                .eq('id', wallet.id);

            // Create transaction record
            await supabaseAdmin
                .from('transactions')
                .insert({
                    user_id: userId,
                    wallet_id: wallet.id,
                    type: 'withdrawal',
                    amount,
                    status: 'pending',
                    reference,
                    paystack_reference: transfer.data.reference,
                    balance_before: wallet.balance,
                    balance_after: newBalance
                });

            res.json({
                message: 'Withdrawal initiated successfully',
                reference,
                amount
            });

        } catch (error) {
            console.error('Withdrawal error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }

    async getTransactions(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20 } = req.query;

            const offset = (page - 1) * limit;

            const { data: transactions, error, count } = await supabaseAdmin
                .from('transactions')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                return res.status(500).json({ error: 'Failed to fetch transactions' });
            }

            res.json({
                transactions,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: count,
                    pages: Math.ceil(count / limit)
                }
            });

        } catch (error) {
            console.error('Get transactions error:', error);
            res.status(500).json({ error: 'Server error' });
        }
    }
}

module.exports = new WalletController();