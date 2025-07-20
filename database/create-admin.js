const bcrypt = require('bcryptjs');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function createAdmin() {
    try {
        const email = process.env.ADMIN_EMAIL || 'admin@suregamers.com';
        const password = process.env.ADMIN_PASSWORD || 'TeteAdmin2025!';
        
        // Hash password
        const passwordHash = await bcrypt.hash(password, 10);
        
        // Create admin user
        const { data, error } = await supabase
            .from('admin_users')
            .insert({
                email: email,
                password_hash: passwordHash,
                full_name: 'System Administrator',
                role: 'super_admin',
                permissions: {
                    users: ['read', 'write', 'delete'],
                    wagers: ['read', 'write', 'delete'],
                    transactions: ['read', 'write'],
                    disputes: ['read', 'write'],
                    settings: ['read', 'write']
                },
                is_active: true
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error creating admin:', error);
            return;
        }
        
        console.log('✅ Admin user created successfully!');
        console.log('📧 Email:', email);
        console.log('🔑 Password:', password);
        console.log('\n⚠️  Please change the admin password after first login!');
        
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

createAdmin();