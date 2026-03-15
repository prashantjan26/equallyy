const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
async function test() {
  const { data, error } = await supabase.from('trips').insert({
      destination: 'Test',
      start_date: '2025-01-01',
      end_date: '2025-01-05',
      members_count: 2,
      ai_budget_estimate: {}
  }).select()
  console.error("DB ERROR: ", error)
  console.log("DB DATA: ", data)
}
test()
