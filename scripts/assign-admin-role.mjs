
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function assignAdminRole() {
  console.log('🔧 Asignando rol de Administrador a admin@loteria.com...')

  // 1. Obtener usuario
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'admin@loteria.com')
    .single()

  if (userError || !user) {
    console.error('❌ Usuario no encontrado:', userError)
    return
  }

  // 2. Obtener rol
  const { data: role, error: roleError } = await supabase
    .from('roles')
    .select('id')
    .eq('name', 'Administrador')
    .single()

  if (roleError || !role) {
    console.error('❌ Rol Administrador no encontrado:', roleError)
    return
  }

  // 3. Asignar rol
  const { error: assignError } = await supabase
    .from('user_roles')
    .upsert([
      {
        user_id: user.id,
        role_id: role.id
      }
    ], { onConflict: 'user_id,role_id' })

  if (assignError) {
    console.error('❌ Error asignando rol:', assignError)
  } else {
    console.log('✅ Rol asignado correctamente.')
  }
}

assignAdminRole()
