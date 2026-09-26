const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const val = parts.slice(1).join('=').trim().replace(/^["']|["']$/g, '');
        if (key) env[key] = val;
    }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

async function inspectColumns() {
    const tables = [
        'profiles', 'warehouses', 'locations', 'categories', 'products',
        'stock_levels', 'reorder_rules', 'receipts', 'receipt_items',
        'deliveries', 'delivery_items', 'transfers', 'transfer_items',
        'adjustments', 'adjustment_items', 'stock_moves'
    ];

    for (const t of tables) {
        // We can select non-existent column to see error or select *
        const { data, error } = await supabase.from(t).insert({ __dummy_col__: 'test' });
        console.log(`Table ${t}:`, error ? error.message : 'inserted?');
    }
}

inspectColumns();
