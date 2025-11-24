
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanUsersAsAdmin() {
  console.log('🔑 Iniciando sesión como Admin...')
  
  const { error: loginError } = await supabase.auth.signInWithPassword({
    email: 'admin@loteria.com',
    password: '123456'
  })

  if (loginError) {
    console.error('❌ Error de login:', loginError.message)
    return
  }

  console.log('✅ Login exitoso. Buscando usuarios...')

  const { data: users, error: listError } = await supabase
    .from('users')
    .select('id, email, name')
  
  if (listError) {
    console.error('❌ Error listando usuarios:', listError)
    return
  }

  console.log('📊 Usuarios encontrados:', users.length)
  users.forEach(u => console.log(` - ${u.email} (${u.name})`))

  const targetEmail = 'natachaa0424@gmail.com'
  const userToDelete = users.find(u => u.email === targetEmail)

  if (userToDelete) {
    console.log(`\n🗑️ Borrando ${targetEmail}...`)
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userToDelete.id)

    if (deleteError) {
      console.error('❌ Error borrando:', deleteError)
    } else {
      console.log('✅ Usuario eliminado correctamente.')
    }
  } else {
    console.log(`\nℹ️ No se encontró a ${targetEmail} en la lista visible.`)
  }
}

cleanUsersAsAdmin()
