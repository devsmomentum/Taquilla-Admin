
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugCreateDani() {
  console.log('🔍 Intentando crear dani@loteria.com...')

  // 1. Verificar si existe en Auth
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'dani@loteria.com',
    password: '123456' // Probamos con contraseña por defecto
  })

  if (authData.user) {
    console.log('✅ El usuario YA EXISTE en Auth (Login exitoso). ID:', authData.user.id)
    return
  } else {
    console.log('ℹ️ El usuario NO puede hacer login (o contraseña incorrecta). Error:', authError?.message)
  }

  // 2. Intentar crear con SignUp
  console.log('📝 Intentando SignUp...')
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: 'dani@loteria.com',
    password: '123456',
    options: {
      data: { name: 'Dani' }
    }
  })

  if (signUpError) {
    console.error('❌ Error en SignUp:', signUpError.message)
    console.error('Status:', signUpError.status)
  } else {
    console.log('✅ SignUp exitoso. ID:', signUpData.user?.id)
    
    // 3. Confirmar
    console.log('🔧 Confirmando...')
    const { error: rpcError } = await supabase.rpc('confirm_user_and_sync', {
      user_email: 'dani@loteria.com',
      user_name: 'Dani',
      user_password_hash: '123456',
      is_active: true
    })

    if (rpcError) {
      console.error('❌ Error en RPC:', rpcError)
    } else {
      console.log('✅ Usuario confirmado y sincronizado.')
    }
  }
}

debugCreateDani()
