
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function cleanTestUser() {
  console.log('🧹 Limpiando usuario de prueba...')
  
  // Necesitamos service_role para borrar de auth.users, pero no lo tenemos.
  // Solo podemos borrar de public.users si el RPC lo permite o si tenemos acceso.
  // Pero como usamos signUp, el usuario está en Auth.
  
  // Intentaremos borrar de public.users al menos.
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('email', 'dani.test@loteria.com')

  if (error) console.log('Error borrando de public:', error)
  else console.log('Borrado de public.users')
}

cleanTestUser()
