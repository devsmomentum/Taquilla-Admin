import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Variables de entorno no configuradas')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createAdminUser() {
  console.log('🔧 Creando usuario administrador...')
  
  try {
    // Verificar si ya existe el usuario
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@loteria.com')
      .single()
    
    if (existingUser) {
      console.log('✅ Usuario admin ya existe')
      console.log('📧 Email:', existingUser.email)
      console.log('👤 Nombre:', existingUser.name)
      console.log('🟢 Activo:', existingUser.is_active)
      return
    }
    
    // Crear usuario simple para pruebas (sin hash por ahora)
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name: 'Administrador Principal',
          email: 'admin@loteria.com',
          password_hash: 'Admin123!', // Sin hash por ahora para testing
          is_active: true
        }
      ])
      .select()
    
    if (error) {
      console.log('❌ Error creando usuario:', error.message)
      console.log('💡 Código de error:', error.code)
      
      if (error.message.includes('duplicate key')) {
        console.log('🔄 El usuario ya existe, intentando obtenerlo...')
        const { data: user } = await supabase
          .from('users')
          .select('*')
          .eq('email', 'admin@loteria.com')
          .single()
        
        if (user) {
          console.log('✅ Usuario encontrado:', user.email)
        }
      }
    } else {
      console.log('✅ Usuario creado exitosamente')
      console.log('📧 Email: admin@loteria.com')
      console.log('🔑 Contraseña: Admin123!')
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

// Ejecutar creación de usuario
createAdminUser().then(() => {
  console.log('\n📋 Instrucciones:')
  console.log('1. Ve a http://localhost:5000')
  console.log('2. Usa las credenciales:')
  console.log('   📧 Email: admin@loteria.com')
  console.log('   🔑 Contraseña: Admin123!')
  process.exit(0)
})