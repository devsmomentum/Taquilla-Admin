
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAdmin() {
  console.log('🔍 Verificando si existe admin@loteria.com...')

  // Intentar SignUp
  const { data, error } = await supabase.auth.signUp({
    email: 'admin@loteria.com',
    password: 'NewPassword123!', // Contraseña temporal para probar creación
    options: {
      data: {
        name: 'Admin Check'
      }
    }
  })

  if (error) {
    console.log('❌ Error al hacer SignUp:', error.message)
    if (error.message.includes('already registered')) {
      console.log('ℹ️ El usuario YA EXISTE.')
      
      // Intentar SignIn con la contraseña esperada
      console.log('🔑 Intentando SignIn con 123456...')
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: 'admin@loteria.com',
        password: '123456'
      })

      if (signInError) {
        console.log('❌ SignIn falló:', signInError.message)
        console.log('Status:', signInError.status)
      } else {
        console.log('✅ SignIn EXITOSO con 123456!')
        console.log('User ID:', signInData.user.id)
      }
    }
  } else {
    console.log('✅ Usuario creado exitosamente (no existía).')
    console.log('User ID:', data.user.id)
    // Si se creó, ahora tiene la contraseña 'NewPassword123!'
  }
}

checkAdmin()
