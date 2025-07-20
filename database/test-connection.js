const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        console.log('🔄 Testing Supabase connection...');
        
        // Test basic connection
        const { data, error } = await supabase
            .from('wager_categories')
            .select('*');
        
        if (error) {
            console.error('❌ Connection failed:', error);
            return;
        }
        
        console.log('✅ Successfully connected to Supabase!');
        console.log(`📊 Found ${data.length} wager categories`);
        
        // Test auth
        console.log('🔐 Testing auth functionality...');
        const { data: authData, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
            console.log('ℹ️  No authenticated user (this is normal for service key)');
        }
        
        console.log('\n✅ Database connection test completed successfully!');
        
    } catch (err) {
        console.error('❌ Unexpected error:', err);
    }
}

testConnection();