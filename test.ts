import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    const { data, error } = await supabase.from('group_members').insert({ group_id: '1fe7bdf9-482d-411a-ab93-4eeba3cf5e61', is_guest: true, guest_name: 'Test' }).select()
    console.log("Error:", error)
    console.log("Data:", data)
}
test()
