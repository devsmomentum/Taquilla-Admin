import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testSimpleUserCreation() {
  console.log('🧪 Probando creación simple de usuario sin foreign key...\n')

  try {
    // Crear usuario sin created_by para evitar constraint
    console.log('1. Creando usuario sin created_by...')
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          name: 'Usuario Prueba Simple',
          email: 'simple@test.com',
          password_hash: 'hashed_password_simple',
          is_active: true
          // NO incluir created_by para evitar foreign key constraint
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creando usuario:', createError)
      return
    }

    console.log('✅ Usuario creado exitosamente:')
    console.log('  - ID:', newUser.id)
    console.log('  - Nombre:', newUser.name)
    console.log('  - Email:', newUser.email)
    console.log('  - Activo:', newUser.is_active)
    console.log('  - Created by:', newUser.created_by)

    // Cargar desde la vista para verificar
    console.log('\n2. Cargando desde vista users_with_roles...')
    const { data: userWithRoles, error: viewError } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('id', newUser.id)
      .single()

    if (viewError) {
      console.error('❌ Error cargando desde vista:', viewError)
    } else {
      console.log('✅ Usuario cargado desde vista:')
      console.log('  - Nombre:', userWithRoles.name)
      console.log('  - Roles:', userWithRoles.roles?.length || 0)
    }

    // Limpiar
    console.log('\n3. Limpiando - eliminando usuario de prueba...')
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', newUser.id)

    if (deleteError) {
      console.error('❌ Error eliminando usuario:', deleteError)
    } else {
      console.log('✅ Usuario eliminado exitosamente')
    }

    console.log('\n🎉 ¡Prueba simple completada exitosamente!')

  } catch (error) {
    console.error('💥 Error general:', error)
  }
}

testSimpleUserCreation()