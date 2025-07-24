const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function createAdmin() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;
    
    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);
    
    // Create admin user with all required fields
    const { data, error } = await supabase
        .from('users')
        .insert({
            email: email,
            username: 'admin',
            password_hash: passwordHash,
            first_name: 'Admin',
            last_name: 'User',
            date_of_birth: '1990-01-01',  // Added this!
            email_verified: true,
            profile_completed: true,
            status: 'active',
            bank_name: 'admin',
            bank_account_number: '0000000000',
            bank_account_name: 'Admin Account'
        })
        .select()
        .single();
    
    if (error) {
        console.error('Error creating admin:', error);
    } else {
        console.log('✅ Admin user created successfully!');
        console.log('Email:', email);
        console.log('Password:', password);
        console.log('\nYou can now login at: https://www.tete9ja.com/admin/login.html');
    }
}

createAdmin();