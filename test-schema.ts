import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data, error } = await supabase.from('information_schema.key_column_usage')
        .select('*')
        .eq('table_name', 'expenses')
        .eq('column_name', 'paid_by')
    
    console.log("FKs for paid_by:", data)
    
    // Also check if paid_by can be null
    const { data: cols } = await supabase.from('information_schema.columns')
        .select('column_name, is_nullable')
        .eq('table_name', 'expenses')
        .eq('column_name', 'paid_by')
    console.log("Is nullable:", cols)
}

test()
