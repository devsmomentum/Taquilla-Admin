import { createClient } from '@supabase/supabase-js'

const url = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(url, key)

async function test() {
  try {
    // Try to select from a table that likely exists or just check health?
    // The setup script checked 'users'.
    const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true })
    
    if (error) {
      console.log('Connected to Supabase, but encountered an error querying "users" table (this is expected if tables are not created yet):', error.message)
    } else {
      console.log('Successfully connected to Supabase!')
    }
  } catch (e) {
    console.error('Unexpected error:', e)
  }
}

test()
