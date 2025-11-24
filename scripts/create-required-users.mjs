import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createRequiredUsers() {
  console.log('🏗️ Creando usuarios requeridos para el sistema...\n')

  // Usuarios que necesitas según tu sistema de autenticación
  const requiredUsers = [
    {
      name: 'Administrador Principal',
      email: 'admin@loteria.com',
      password: 'admin123',
      role: 'admin'
    },
    {
      name: 'Juan Pérez',
      email: 'juan@loteria.com', 
      password: 'juan123',
      role: 'operator'
    },
    {
      name: 'María García',
      email: 'maria@loteria.com',
      password: 'maria123', 
      role: 'supervisor'
    }
  ]

  try {
    // 1. Primero obtener los roles existentes
    console.log('1. Obteniendo roles disponibles...')
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name')

    if (rolesError) {
      console.error('❌ Error obteniendo roles:', rolesError)
      return
    }

    console.log('✅ Roles encontrados:', roles.map(r => r.name).join(', '))

    // 2. Crear cada usuario
    for (const userData of requiredUsers) {
      console.log(`\n2. Creando usuario: ${userData.name} (${userData.email})...`)

      try {
        // Verificar si el usuario ya existe
        const { data: existingUser } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', userData.email)
          .single()

        if (existingUser) {
          console.log(`⚠️ Usuario ${userData.email} ya existe, saltando...`)
          continue
        }

        // Crear el usuario
        const passwordHash = `hashed_${userData.password}_${Date.now()}`
        
        const { data: newUser, error: userError } = await supabase
          .from('users')
          .insert([
            {
              name: userData.name,
              email: userData.email,
              password_hash: passwordHash,
              is_active: true,
              created_by: null
            }
          ])
          .select()
          .single()

        if (userError) {
          console.error(`❌ Error creando usuario ${userData.email}:`, userError)
          continue
        }

        console.log(`✅ Usuario creado: ${newUser.name} - ID: ${newUser.id}`)

        // Buscar el rol correspondiente
        const roleMapping = {
          'admin': 'Administrador',
          'operator': 'Operador', 
          'supervisor': 'Supervisor'
        }

        const roleName = roleMapping[userData.role]
        const role = roles.find(r => r.name === roleName)

        if (role) {
          // Asignar el rol
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert([
              {
                user_id: newUser.id,
                role_id: role.id
              }
            ])

          if (roleError) {
            console.error(`❌ Error asignando rol ${roleName} a ${userData.email}:`, roleError)
          } else {
            console.log(`✅ Rol ${roleName} asignado a ${userData.name}`)
          }
        } else {
          console.log(`⚠️ Rol ${roleName} no encontrado para ${userData.name}`)
        }

      } catch (error) {
        console.error(`💥 Error procesando usuario ${userData.email}:`, error)
      }
    }

    // 3. Verificar usuarios creados
    console.log('\n3. Verificando usuarios creados...')
    const { data: allUsers, error: listError } = await supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: true })

    if (listError) {
      console.error('❌ Error listando usuarios:', listError)
    } else {
      console.log('\n✅ Usuarios en la base de datos:')
      allUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} (${user.email}) - Activo: ${user.is_active}`)
      })
    }

    console.log('\n🎉 ¡Proceso completado!')
    console.log('\n📋 Usuarios de prueba disponibles:')
    console.log('   • admin@loteria.com / admin123')
    console.log('   • juan@loteria.com / juan123') 
    console.log('   • maria@loteria.com / maria123')

  } catch (error) {
    console.error('💥 Error general:', error)
  }
}

createRequiredUsers()