
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function addTaquillasPermission() {
  console.log('🔧 Agregando permiso "taquillas" al rol Administrador...')

  // 1. Obtener permisos actuales
  const { data: role, error: fetchError } = await supabase
    .from('roles')
    .select('id, permissions')
    .eq('name', 'Administrador')
    .single()

  if (fetchError) {
    console.error('❌ Error obteniendo rol:', fetchError)
    return
  }

  const currentPermissions = role.permissions || []
  
  if (currentPermissions.includes('taquillas')) {
    console.log('✅ El rol ya tiene el permiso "taquillas"')
    return
  }

  const newPermissions = [...currentPermissions, 'taquillas']

  // 2. Actualizar permisos
  const { error: updateError } = await supabase
    .from('roles')
    .update({ permissions: newPermissions })
    .eq('id', role.id)

  if (updateError) {
    console.error('❌ Error actualizando permisos:', updateError)
  } else {
    console.log('✅ Permiso "taquillas" agregado exitosamente.')
    console.log('Nuevos permisos:', newPermissions)
  }
}

addTaquillasPermission()
