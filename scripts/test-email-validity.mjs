
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testEmailValidity() {
  console.log('🧪 Probando validez de emails...')

  const emails = [
    'dani@loteria.com',
    'dani.test@loteria.com',
    'dani123@gmail.com'
  ]

  for (const email of emails) {
    console.log(`\n📧 Probando: ${email}`)
    const { data, error } = await supabase.auth.signUp({
      email: email,
      password: 'Password123!',
    })

    if (error) {
      console.log(`❌ Error: ${error.message} (Status: ${error.status})`)
    } else {
      console.log(`✅ Éxito. ID: ${data.user?.id}`)
    }
  }
}

testEmailValidity()
