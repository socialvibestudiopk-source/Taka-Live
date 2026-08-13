const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Supabase URL or Secret Key missing in .env file");
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
