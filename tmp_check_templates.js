
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Attempt to find service role key, otherwise use anon
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    key.trim()
);

async function checkTemplates() {
    // Fetch columns by getting one row
    const { data, error } = await supabase
        .from('Templates')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data.length === 0) {
        console.log('No templates found in table.');
        return;
    }

    console.log('Columns in Templates table:', Object.keys(data[0]));

    // Now fetch all with names
    const { data: allData } = await supabase
        .from('Templates')
        .select('id, template_name, name')
        .limit(20);

    console.log('Template names in DB:');
    console.table(allData);
}

checkTemplates();
