import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function test() {
    console.log("Testing error for group_members insert...")
    // Insert with fake group_id to see if we get a schema error first
    const { error } = await supabase
        .from('group_members')
        .insert({
            group_id: '00000000-0000-0000-0000-000000000000',
            is_guest: true,
            guest_name: 'Test Guest'
        })
    
    console.log("Error object returned:", JSON.stringify(error, null, 2))
}

test()
