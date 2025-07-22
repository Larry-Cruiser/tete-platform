// Create a file called createWallet.js
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createWallet(userEmail) {
    // First, find the user
    const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('email', userEmail)
        .single();

    if (userError) {
        console.error('User not found:', userError);
        return;
    }

    // Check if wallet exists
    const { data: existingWallet } = await supabase
        .from('wallets')
        .select('id')
        .eq('user_id', user.id)
        .single();

    if (existingWallet) {
        console.log('Wallet already exists for this user');
        return;
    }

    // Create wallet
    const { data: wallet, error: walletError } = await supabase
        .from('wallets')
        .insert({
            user_id: user.id,
            balance: 0
        })
        .select()
        .single();

    if (walletError) {
        console.error('Error creating wallet:', walletError);
    } else {
        console.log('Wallet created successfully:', wallet);
    }
}

// Replace with your email
createWallet('your_email@example.com');