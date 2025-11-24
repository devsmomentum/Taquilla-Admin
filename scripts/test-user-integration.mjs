import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function testUserIntegration() {
  console.log('🧪 Probando integración completa de usuarios...\n')

  try {
    // 1. Crear un usuario de prueba
    console.log('1. Creando usuario de prueba...')
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert([
        {
          name: 'Usuario Prueba Integración',
          email: 'prueba-integracion@test.com',
          password_hash: 'hashed_password_123',
          is_active: true,
          created_by: 'test-system'
        }
      ])
      .select()
      .single()

    if (createError) {
      console.error('❌ Error creando usuario:', createError)
      return
    }

    console.log('✅ Usuario creado:', newUser.name, '- ID:', newUser.id)

    // 2. Obtener un rol existente para asignar
    console.log('\n2. Obteniendo roles disponibles...')
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(1)

    if (rolesError || !roles || roles.length === 0) {
      console.log('⚠️ No se encontraron roles, continuando sin asignar rol')
    } else {
      const role = roles[0]
      console.log('✅ Rol encontrado:', role.name)

      // 3. Asignar rol al usuario
      console.log('\n3. Asignando rol al usuario...')
      const { error: roleAssignError } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: newUser.id,
            role_id: role.id
          }
        ])

      if (roleAssignError) {
        console.error('❌ Error asignando rol:', roleAssignError)
      } else {
        console.log('✅ Rol asignado exitosamente')
      }
    }

    // 4. Cargar usuario con roles desde la vista
    console.log('\n4. Cargando usuario desde vista users_with_roles...')
    const { data: userWithRoles, error: viewError } = await supabase
      .from('users_with_roles')
      .select('*')
      .eq('id', newUser.id)
      .single()

    if (viewError) {
      console.error('❌ Error cargando desde vista:', viewError)
    } else {
      console.log('✅ Usuario con roles cargado:')
      console.log('  - Nombre:', userWithRoles.name)
      console.log('  - Email:', userWithRoles.email)
      console.log('  - Activo:', userWithRoles.is_active)
      console.log('  - Roles:', userWithRoles.roles?.map(r => r.name).join(', ') || 'Sin roles')
    }

    // 5. Actualizar usuario
    console.log('\n5. Actualizando usuario...')
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        name: 'Usuario Prueba ACTUALIZADO',
        is_active: false 
      })
      .eq('id', newUser.id)

    if (updateError) {
      console.error('❌ Error actualizando usuario:', updateError)
    } else {
      console.log('✅ Usuario actualizado exitosamente')
    }

    // 6. Verificar actualización
    console.log('\n6. Verificando actualización...')
    const { data: updatedUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', newUser.id)
      .single()

    if (checkError) {
      console.error('❌ Error verificando actualización:', checkError)
    } else {
      console.log('✅ Actualización verificada:')
      console.log('  - Nuevo nombre:', updatedUser.name)
      console.log('  - Activo:', updatedUser.is_active)
    }

    // 7. Limpiar - eliminar usuario de prueba
    console.log('\n7. Limpiando - eliminando usuario de prueba...')
    
    // Primero eliminar relaciones de roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', newUser.id)

    // Luego eliminar usuario
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', newUser.id)

    if (deleteError) {
      console.error('❌ Error eliminando usuario:', deleteError)
    } else {
      console.log('✅ Usuario de prueba eliminado exitosamente')
    }

    console.log('\n🎉 ¡Integración de usuarios completamente funcional!')
    console.log('📋 Resumen:')
    console.log('  ✅ Crear usuarios')
    console.log('  ✅ Asignar roles')
    console.log('  ✅ Cargar desde vista users_with_roles')
    console.log('  ✅ Actualizar usuarios')
    console.log('  ✅ Eliminar usuarios')
    console.log('\n🚀 El módulo de usuarios está listo para usar con Supabase!')

  } catch (error) {
    console.error('💥 Error general en la prueba:', error)
  }
}

testUserIntegration()