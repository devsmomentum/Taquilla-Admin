
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function updatePassword() {
  console.log('🔑 Intentando login con NewPassword123!...')
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'admin@loteria.com',
    password: 'NewPassword123!'
  })

  if (error) {
    console.log('❌ Login falló:', error.message)
    return
  }

  console.log('✅ Login exitoso. Actualizando contraseña a 123456...')
  
  const { data: updateData, error: updateError } = await supabase.auth.updateUser({
    password: '123456'
  })

  if (updateError) {
    console.log('❌ Error actualizando contraseña:', updateError.message)
  } else {
    console.log('✅ Contraseña actualizada a 123456')
  }
}

updatePassword()
