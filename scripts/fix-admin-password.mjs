
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAdminPassword() {
  console.log('🔧 Intentando actualizar contraseña de admin...')

  const sql = `
    UPDATE auth.users
    SET encrypted_password = crypt('123456', gen_salt('bf')),
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        raw_app_meta_data = '{"provider": "email", "providers": ["email"]}',
        raw_user_meta_data = '{"name": "Administrador"}'
    WHERE email = 'admin@loteria.com';
  `

  const { data, error } = await supabase.rpc('query', {
    query: sql
  })

  if (error) {
    console.error('❌ Error ejecutando SQL:', error)
    
    // Si falla el RPC 'query', intentamos con 'exec_sql' o similar si existe,
    // o reportamos que no se puede ejecutar SQL arbitrario.
  } else {
    console.log('✅ SQL ejecutado correctamente (o al menos sin error devuelto)')
    console.log('Resultado:', data)
  }
}

fixAdminPassword()
