
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAdminPermissions() {
  console.log('🔍 Verificando permisos del rol Administrador...')

  const { data: role, error } = await supabase
    .from('roles')
    .select('*')
    .eq('name', 'Administrador')
    .single()

  if (error) {
    console.error('❌ Error obteniendo rol:', error)
    return
  }

  console.log('Rol:', role.name)
  console.log('Permisos:', role.permissions)
  
  if (role.permissions.includes('*')) {
    console.log('✅ El rol tiene permiso universal (*)')
  } else if (role.permissions.includes('taquillas')) {
    console.log('✅ El rol tiene permiso explícito "taquillas"')
  } else {
    console.log('❌ El rol NO tiene permiso "taquillas"')
  }
}

checkAdminPermissions()
