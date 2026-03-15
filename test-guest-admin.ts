import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
    // 1. Authenticate first so we have a valid session context for RLS
    // We need an email/password from the user's DB, but we can't get that easily here 
    // without their password. 
    
    // Instead, let's just inspect the schema again. 
    // Maybe the insert query doesn't match the table definition perfectly?
    // E.g., maybe the user_id column doesn't have a default value of NULL?
    
    console.log("Checking if we can insert via service role to bypass RLS and verify schema...")
    
    // If we have service role key, we can verify it's just RLS and not a schema error
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
        console.log("No service role key found. Cannot bypass RLS.")
        return
    }
    
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey)
    
    // Get a group ID
    const { data: groups } = await adminSupabase.from('groups').select('id').limit(1)
    if (!groups || groups.length === 0) {
        console.log("No groups found.")
        return
    }
    
    const groupId = groups[0].id
    
    const { data, error } = await adminSupabase
        .from('group_members')
        .insert({
            group_id: groupId,
            is_guest: true,
            guest_name: 'Service Role Test Guest'
        })
        .select()
        
    console.log("Admin Insert Error:", JSON.stringify(error, null, 2))
    console.log("Admin Insert Data:", data)
}

test()
