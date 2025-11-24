
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function setAdminWildcard() {
  console.log('🔧 Configurando permiso universal (*) para Administrador...')

  const { error } = await supabase
    .from('roles')
    .update({ permissions: ['*'] })
    .eq('name', 'Administrador')

  if (error) {
    console.error('❌ Error actualizando rol:', error)
  } else {
    console.log('✅ Rol Administrador actualizado con permiso universal (*).')
  }
}

setAdminWildcard()
