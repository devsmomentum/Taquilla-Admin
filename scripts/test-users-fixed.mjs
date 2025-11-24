import { supabase } from './src/lib/supabase.js'

console.log('🧪 Probando consulta corregida de usuarios...\n')

async function testUserQuery() {
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

async function testDuplicateCheck() {
  try {
    console.log('\n2. Probando verificación de duplicados...')
    
    const testEmail = 'test@example.com'
    
    const { data: existingUsers, error } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', testEmail)

    if (error) {
      console.error('❌ Error en verificación de duplicados:', error)
      return false
    }

    console.log(`✅ Verificación de duplicados exitosa! Usuarios con ${testEmail}: ${existingUsers.length}`)
    return true

  } catch (error) {
    console.error('💥 Error en verificación de duplicados:', error)
    return false
  }
}

async function runTests() {
  const test1 = await testUserQuery()
  const test2 = await testDuplicateCheck()
  
  console.log('\n🏁 Resultados:')
  console.log(`   📊 Consulta de usuarios: ${test1 ? '✅ EXITOSA' : '❌ FALLÓ'}`)
  console.log(`   🔍 Verificación de duplicados: ${test2 ? '✅ EXITOSA' : '❌ FALLÓ'}`)
  
  if (test1 && test2) {
    console.log('\n🎉 ¡Todas las pruebas pasaron! El error de JSON está corregido.')
  } else {
    console.log('\n⚠️ Algunas pruebas fallaron.')
  }
}

runTests()