import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

const defaultRoles = [
  {
    name: 'Super Administrador',
    description: 'Acceso completo al sistema',
    permissions: ['*'],
    is_system: true
  },
  {
    name: 'Administrador',
    description: 'Gestión de operaciones principales',
    permissions: ['dashboard', 'lotteries', 'bets', 'winners', 'history', 'users', 'roles'],
    is_system: false
  },
  {
    name: 'Operador',
    description: 'Operaciones básicas de apuestas y sorteos',
    permissions: ['dashboard', 'lotteries', 'bets', 'winners'],
    is_system: false
  },
  {
    name: 'Cajero',
    description: 'Gestión de transferencias y retiros',
    permissions: ['dashboard', 'history'],
    is_system: false
  },
  {
    name: 'Consultor',
    description: 'Solo consultas y reportes',
    permissions: ['dashboard'],
    is_system: false
  }
]

async function initializeRoles() {
  console.log('🔧 Inicializando roles en Supabase...')
  
  try {
    // Verificar roles existentes
    const { data: existingRoles, error: selectError } = await supabase
      .from('roles')
      .select('name')
    
    if (selectError) {
      console.log('❌ Error verificando roles:', selectError.message)
      return
    }
    
    const existingNames = existingRoles.map(role => role.name)
    console.log('📋 Roles existentes:', existingNames)
    
    // Insertar roles que no existen
    for (const role of defaultRoles) {
      if (!existingNames.includes(role.name)) {
        const { data, error } = await supabase
          .from('roles')
          .insert([role])
          .select()
        
        if (error) {
          console.log(`❌ Error creando rol "${role.name}":`, error.message)
        } else {
          console.log(`✅ Rol "${role.name}" creado exitosamente`)
        }
      } else {
        console.log(`⚠️  Rol "${role.name}" ya existe, omitiendo...`)
      }
    }
    
    // Mostrar roles finales
    const { data: finalRoles } = await supabase
      .from('roles')
      .select('*')
      .order('created_at')
    
    console.log('\n📊 Roles en la base de datos:')
    finalRoles.forEach(role => {
      console.log(`  • ${role.name}: ${role.description}`)
      console.log(`    Permisos: ${role.permissions.join(', ')}`)
      console.log(`    Sistema: ${role.is_system ? 'Sí' : 'No'}\n`)
    })
    
  } catch (error) {
    console.error('❌ Error general:', error.message)
  }
}

// Ejecutar inicialización
initializeRoles().then(() => {
  console.log('🎉 Inicialización completada!')
  console.log('🌐 Ahora puedes ir a http://localhost:5001 y ver la sección de Roles')
  process.exit(0)
})