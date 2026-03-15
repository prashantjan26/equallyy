import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data: cols, error } = await supabase.from('information_schema.columns')
        .select('column_name, data_type')
        .eq('table_name', 'trips')
    
    if (error) {
        console.error("Error fetching schema:", error)
        return
    }
    
    console.log("Columns in trips table:")
    cols.forEach(c => console.log(`- ${c.column_name} (${c.data_type})`))
}

test()
