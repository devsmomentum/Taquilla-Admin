import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧪 Probando consultas corregidas (sin .single())...\n')

async function testSimpleUsersQuery() {
  try {
    console.log('1. Probando consulta simple de usuarios...')
    
    const { data, error } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        is_active,
        created_at,
        created_by
      `)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('❌ Error en consulta:', error)
      return false
    }

    console.log(`✅ Consulta exitosa! Encontrados ${data.length} usuarios`)
    
    if (data.length > 0) {
      console.log('\n📋 Usuarios encontrados:')
      data.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email})`)
      })
    }

    return true

  } catch (error) {
    console.error('💥 Error durante la prueba:', error)
    return false
  }
}

async function testDuplicateCheckQuery() {
  try {
    console.log('\n2. Probando verificación de duplicados (sin .single())...')
    
    const testEmail = 'admin@loteria.com'
    
    const { data: existingUsers, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testEmail)

    if (error) {
      console.error('❌ Error en verificación de duplicados:', error)
      return false
    }

    console.log(`✅ Verificación exitosa! Usuarios con ${testEmail}: ${existingUsers.length}`)
    
    if (existingUsers.length > 0) {
      console.log(`   📧 Usuario encontrado: ID ${existingUsers[0].id}`)
    }
    
    return true

  } catch (error) {
    console.error('💥 Error en verificación de duplicados:', error)
    return false
  }
}

async function testInsertQuery() {
  try {
    console.log('\n3. Probando inserción (sin .single())...')
    
    const testUser = {
      name: 'Usuario de Prueba',
      email: `test-${Date.now()}@example.com`,
      password_hash: `hash-${Date.now()}`,
      is_active: true,
      created_by: null
    }
    
    const { data: insertedUsers, error } = await supabase
      .from('users')
      .insert([testUser])
      .select()

    if (error) {
      console.error('❌ Error en inserción:', error)
      return false
    }

    if (insertedUsers && insertedUsers.length > 0) {
      const insertedUser = insertedUsers[0]
      console.log(`✅ Usuario insertado exitosamente! ID: ${insertedUser.id}`)
      
      // Limpiar - eliminar el usuario de prueba
      await supabase
        .from('users')
        .delete()
        .eq('id', insertedUser.id)
      
      console.log(`🧹 Usuario de prueba eliminado`)
    }

    return true

  } catch (error) {
    console.error('💥 Error en inserción:', error)
    return false
  }
}

async function runAllTests() {
  console.log('🚀 Iniciando pruebas de queries corregidas...\n')
  
  const test1 = await testSimpleUsersQuery()
  const test2 = await testDuplicateCheckQuery()
  const test3 = await testInsertQuery()
  
  console.log('\n🏁 Resultados finales:')
  console.log(`   📊 Consulta simple: ${test1 ? '✅ EXITOSA' : '❌ FALLÓ'}`)
  console.log(`   🔍 Verificación de duplicados: ${test2 ? '✅ EXITOSA' : '❌ FALLÓ'}`)
  console.log(`   ➕ Inserción: ${test3 ? '✅ EXITOSA' : '❌ FALLÓ'}`)
  
  if (test1 && test2 && test3) {
    console.log('\n🎉 ¡TODAS LAS PRUEBAS PASARON!')
    console.log('✨ El error "Cannot coerce the result to a single JSON object" está CORREGIDO')
    console.log('🔄 El sistema híbrido debería funcionar perfectamente ahora')
  } else {
    console.log('\n⚠️ Algunas pruebas fallaron, revisar logs arriba')
  }
}

runAllTests()