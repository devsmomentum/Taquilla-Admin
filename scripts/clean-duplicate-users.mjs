import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🧹 Limpiando usuarios duplicados en Supabase...\n')

async function cleanDuplicateUsers() {
  try {
    console.log('1. Obteniendo todos los usuarios...')
    
    const { data: allUsers, error: fetchError } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: true })

    if (fetchError) {
      console.error('❌ Error obteniendo usuarios:', fetchError)
      return
    }

    console.log(`📊 Total de usuarios encontrados: ${allUsers.length}`)
    
    if (allUsers.length === 0) {
      console.log('✅ No hay usuarios para limpiar')
      return
    }

    // Agrupar por email para encontrar duplicados
    const emailGroups = {}
    allUsers.forEach(user => {
      if (!emailGroups[user.email]) {
        emailGroups[user.email] = []
      }
      emailGroups[user.email].push(user)
    })

    console.log('\n2. Analizando duplicados...')
    
    const duplicateEmails = Object.keys(emailGroups).filter(email => emailGroups[email].length > 1)
    
    if (duplicateEmails.length === 0) {
      console.log('✅ No se encontraron emails duplicados')
      console.log('\n📋 Usuarios existentes:')
      allUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.name} (${user.email}) - ID: ${user.id}`)
      })
      return
    }

    console.log(`⚠️ Encontrados ${duplicateEmails.length} emails duplicados:`)
    
    let usersToDelete = []
    
    duplicateEmails.forEach(email => {
      const duplicateUsers = emailGroups[email]
      console.log(`\n   📧 ${email}:`)
      
      // Ordenar por fecha de creación y mantener el más antiguo
      duplicateUsers.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      
      const keepUser = duplicateUsers[0]
      const deleteUsers = duplicateUsers.slice(1)
      
      console.log(`      ✅ Mantener: ${keepUser.name} (${keepUser.id}) - ${keepUser.created_at}`)
      
      deleteUsers.forEach(user => {
        console.log(`      ❌ Eliminar: ${user.name} (${user.id}) - ${user.created_at}`)
        usersToDelete.push(user)
      })
    })

    if (usersToDelete.length === 0) {
      console.log('\n✅ No hay usuarios para eliminar')
      return
    }

    console.log(`\n3. Eliminando ${usersToDelete.length} usuarios duplicados...`)
    
    for (const user of usersToDelete) {
      try {
        // Eliminar primero las relaciones en user_roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', user.id)

        // Eliminar el usuario
        const { error: deleteError } = await supabase
          .from('users')
          .delete()
          .eq('id', user.id)

        if (deleteError) {
          console.error(`❌ Error eliminando ${user.email}:`, deleteError)
        } else {
          console.log(`🗑️ Eliminado: ${user.name} (${user.email})`)
        }
      } catch (error) {
        console.error(`💥 Error procesando ${user.email}:`, error)
      }
    }

    console.log('\n4. Verificando resultado final...')
    
    const { data: finalUsers, error: finalError } = await supabase
      .from('users')
      .select('id, name, email, created_at')
      .order('created_at', { ascending: true })

    if (finalError) {
      console.error('❌ Error en verificación final:', finalError)
      return
    }

    console.log(`\n✅ Limpieza completada!`)
    console.log(`📊 Usuarios restantes: ${finalUsers.length}`)
    console.log('\n📋 Usuarios finales:')
    finalUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.name} (${user.email})`)
    })

  } catch (error) {
    console.error('💥 Error general:', error)
  }
}

cleanDuplicateUsers()