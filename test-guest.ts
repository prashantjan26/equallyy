import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

async function test() {
    console.log("Fetching groups...")
    const { data: groups, error: gError } = await supabase.from('groups').select('*').limit(1)
    if (gError) return console.error("Group fetch error:", gError)
    
    if (!groups || groups.length === 0) {
        console.log("No groups found.")
        return
    }

    const groupId = groups[0].id
    console.log(`Trying to insert guest into group ${groupId}...`)

    const { data: insertData, error: iError } = await supabase
        .from('group_members')
        .insert({
            group_id: groupId,
            is_guest: true,
            guest_name: 'Test Guest'
        })
        .select()
    
    if (iError) console.error("Insert Error:", iError)
    else console.log("Insert Success:", insertData)
}

test()
