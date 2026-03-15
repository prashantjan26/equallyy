import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    // try signing in to test RLS
    await supabase.auth.signInWithPassword({
        email: 'prashantsingh11b@gmail.com', // just guessing from context, or we can just try anon insert
        password: 'password123'
    })

    const { data: cols, error: schemaError } = await supabase.from('information_schema.columns')
        .select('column_name, is_nullable')
        .eq('table_name', 'trips')
        .eq('column_name', 'group_id')
    
    console.log("Is group_id nullable?", cols)
    
    const { error } = await supabase.from('trips').insert({
        destination: "Test",
        start_date: "2026-03-20",
        end_date: "2026-03-25",
        members_count: 2,
        ai_budget_estimate: {}
    })
    console.log("Insert Test Result:", error)
}

test()
