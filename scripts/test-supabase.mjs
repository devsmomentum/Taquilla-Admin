import { createClient } from '@supabase/supabase-js'

// Cargar configuración desde variables de entorno
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

console.log('🔍 Probando conexión a Supabase...')
console.log(`📊 URL: ${supabaseUrl}`)

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConnection() {
  try {
    console.log('\n1️⃣ Probando conexión básica...')
    
    // Test 1: Verificar conexión básica
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    if (error) {
      console.log('❌ Error en conexión básica:', error.message)
      
      if (error.message.includes('relation "users" does not exist')) {
        console.log('💡 La tabla "users" no existe. Necesitas ejecutar el schema SQL.')
        console.log('   Ve a Supabase Dashboard > SQL Editor y ejecuta supabase-schema.sql')
        return false
      }
      
      return false
    }
    
    console.log('✅ Conexión básica exitosa')
    console.log(`📊 Usuarios en la base de datos: ${data || 0}`)
    
    console.log('\n2️⃣ Probando estructura de tablas...')
    
    // Test 2: Verificar que las tablas principales existen
    const tables = ['users', 'roles', 'lotteries', 'bets', 'draws']
    
    for (const table of tables) {
      try {
        const { error: tableError } = await supabase
          .from(table)
          .select('count', { count: 'exact', head: true })
        
        if (tableError) {
          console.log(`❌ Tabla "${table}" no existe o hay error: ${tableError.message}`)
        } else {
          console.log(`✅ Tabla "${table}" existe`)
        }
      } catch (err) {
        console.log(`❌ Error verificando tabla "${table}":`, err.message)
      }
    }
    
    console.log('\n3️⃣ Probando vista users_with_roles...')
    
    // Test 3: Verificar vista especial para autenticación
    try {
      const { data: viewData, error: viewError } = await supabase
        .from('users_with_roles')
        .select('count', { count: 'exact', head: true })
      
      if (viewError) {
        console.log('❌ Vista "users_with_roles" no existe:', viewError.message)
        console.log('💡 Esta vista es necesaria para la autenticación. Verifica que el schema esté completo.')
      } else {
        console.log('✅ Vista "users_with_roles" existe')
      }
    } catch (err) {
      console.log('❌ Error verificando vista users_with_roles:', err.message)
    }
    
    console.log('\n4️⃣ Verificando datos iniciales...')
    
    // Test 4: Verificar si hay roles creados
    try {
      const { data: rolesData, error: rolesError } = await supabase
        .from('roles')
        .select('name')
        .limit(5)
      
      if (rolesError) {
        console.log('❌ Error consultando roles:', rolesError.message)
      } else {
        console.log(`✅ Roles encontrados: ${rolesData?.length || 0}`)
        if (rolesData?.length > 0) {
          console.log(`   Roles: ${rolesData.map(r => r.name).join(', ')}`)
        } else {
          console.log('💡 No hay roles creados. Ejecuta el script init-data.sql')
        }
      }
    } catch (err) {
      console.log('❌ Error verificando roles:', err.message)
    }
    
    console.log('\n🎉 Pruebas completadas!')
    return true
    
  } catch (error) {
    console.log('❌ Error general:', error.message)
    return false
  }
}

// Ejecutar las pruebas
testConnection().then((success) => {
  if (success) {
    console.log('\n✅ ¡Supabase está conectado y funcionando!')
  } else {
    console.log('\n❌ Hay problemas con la configuración de Supabase')
    console.log('\n📝 Pasos para solucionarlo:')
    console.log('1. Ve a https://app.supabase.com')
    console.log('2. Abre tu proyecto')
    console.log('3. Ve a SQL Editor')
    console.log('4. Ejecuta el contenido de supabase-schema.sql')
    console.log('5. Ejecuta el contenido de init-data.sql (si existe)')
  }
}).catch(err => {
  console.log('❌ Error ejecutando pruebas:', err.message)
})