const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Admin client with full access
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Public client for regular operations
const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

module.exports = {
    supabaseAdmin,
    supabasePublic
};