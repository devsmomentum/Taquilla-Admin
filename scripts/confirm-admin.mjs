
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function confirmAdmin() {
  console.log('🔧 Confirmando admin@loteria.com via RPC...')

  const { error } = await supabase.rpc('confirm_user_and_sync', {
    user_email: 'admin@loteria.com',
    user_name: 'Administrador',
    user_password_hash: '123456', // Esto va a public.users, no afecta auth.users password real
    is_active: true
  })

  if (error) {
    console.error('❌ Error confirmando usuario:', error)
  } else {
    console.log('✅ Usuario confirmado exitosamente.')
  }
}

confirmAdmin()
