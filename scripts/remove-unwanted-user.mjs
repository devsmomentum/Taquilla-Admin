
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUnwantedUser() {
  console.log('🔍 Buscando natachaa0424@gmail.com...')

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'natachaa0424@gmail.com')
    .single()

  if (data) {
    console.log('✅ Usuario encontrado en public.users:', data)
    
    // Intentar borrar
    console.log('🗑️ Intentando borrar...')
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', data.id)
      
    if (deleteError) {
      console.error('❌ Error al borrar:', deleteError)
    } else {
      console.log('✅ Usuario borrado exitosamente de public.users')
    }
  } else {
    console.log('ℹ️ Usuario no encontrado en public.users')
  }
}

checkUnwantedUser()
