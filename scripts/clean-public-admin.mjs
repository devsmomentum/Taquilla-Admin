
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanPublicAdmin() {
  console.log('🧹 Eliminando admin@loteria.com de public.users...')

  const { error } = await supabase
    .from('users')
    .delete()
    .eq('email', 'admin@loteria.com')

  if (error) {
    console.error('❌ Error eliminando:', error)
  } else {
    console.log('✅ Usuario eliminado de public.users (si existía y RLS lo permitió).')
  }
}

cleanPublicAdmin()
