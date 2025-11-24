#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import bcryptjs from 'bcryptjs'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Error: Variables de entorno no configuradas')
  console.error('Necesitas VITE_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env')
  process.exit(1)
}

// Crear cliente con service key para bypass RLS
const supabase = createClient(supabaseUrl, serviceKey)

console.log('🚀 Creando usuarios reales en Supabase...')

// Hash de contraseñas
const adminPasswordHash = await bcryptjs.hash('admin123', 10)
const userPasswordHash = await bcryptjs.hash('usuario123', 10)

// Generar UUIDs válidos
const adminId = randomUUID()
const user1Id = randomUUID()
const user2Id = randomUUID()
const user3Id = randomUUID()

const users = [
  {
    id: adminId,
    name: 'Administrador Principal',
    email: 'admin@loteria.com',
    password_hash: adminPasswordHash,
    is_active: true,
    created_by: null
  },
  {
    id: user1Id,
    name: 'Juan Pérez',
    email: 'juan@loteria.com',
    password_hash: userPasswordHash,
    is_active: true,
    created_by: adminId
  },
  {
    id: user2Id,
    name: 'María García',
    email: 'maria@loteria.com',
    password_hash: userPasswordHash,
    is_active: true,
    created_by: adminId
  },
  {
    id: user3Id,
    name: 'Carlos Rodríguez',
    email: 'carlos@loteria.com',
    password_hash: userPasswordHash,
    is_active: false,
    created_by: adminId
  }
]

try {
  // Insertar usuarios
  console.log('📝 Insertando usuarios...')
  const { data: insertedUsers, error: usersError } = await supabase
    .from('users')
    .insert(users)
    .select()

  if (usersError) {
    console.error('❌ Error insertando usuarios:', usersError)
    process.exit(1)
  }

  console.log('✅ Usuarios creados exitosamente!')

  // Obtener roles para asignar
  const { data: roles, error: rolesError } = await supabase
    .from('roles')
    .select('*')

  if (rolesError) {
    console.error('❌ Error obteniendo roles:', rolesError)
    process.exit(1)
  }

  // Buscar roles específicos
  const adminRole = roles.find(r => r.name.includes('Admin') || r.name.includes('Super'))
  const operatorRole = roles.find(r => r.name.includes('Operador') || r.name.includes('Operator'))

  if (!adminRole || !operatorRole) {
    console.error('❌ No se encontraron roles apropiados')
    console.log('Roles disponibles:', roles.map(r => r.name))
    process.exit(1)
  }

  // Asignar roles
  console.log('🔗 Asignando roles...')
  const userRoles = [
    { user_id: adminId, role_id: adminRole.id },
    { user_id: user1Id, role_id: operatorRole.id },
    { user_id: user2Id, role_id: operatorRole.id },
    { user_id: user3Id, role_id: operatorRole.id }
  ]

  const { error: rolesAssignError } = await supabase
    .from('user_roles')
    .insert(userRoles)

  if (rolesAssignError) {
    console.error('❌ Error asignando roles:', rolesAssignError)
  } else {
    console.log('✅ Roles asignados exitosamente!')
  }

  // Verificar resultados
  console.log('\n📋 Usuarios creados:')
  insertedUsers.forEach(user => {
    console.log(`   • ${user.name} (${user.email}) - ${user.is_active ? 'Activo' : 'Inactivo'}`)
  })

  console.log('\n🔑 Credenciales de acceso:')
  console.log('   • admin@loteria.com / admin123 (Administrador)')
  console.log('   • juan@loteria.com / usuario123 (Operador)')
  console.log('   • maria@loteria.com / usuario123 (Operador)')

  console.log('\n🎉 ¡Integración con Supabase completada!')

} catch (error) {
  console.error('❌ Error general:', error)
  process.exit(1)
}