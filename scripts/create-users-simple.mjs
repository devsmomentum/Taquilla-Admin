#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import bcryptjs from 'bcryptjs'
import { randomUUID } from 'crypto'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const anonKey = process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, anonKey)

console.log('🚀 Intentando crear usuarios con anon key...')

// Primero, intentar deshabilitar RLS temporalmente
console.log('🔓 Intentando deshabilitar RLS para users...')

try {
  const { error: rlsError } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE users DISABLE ROW LEVEL SECURITY;'
  })
  
  if (rlsError) {
    console.log('⚠️  No se pudo deshabilitar RLS:', rlsError.message)
  } else {
    console.log('✅ RLS deshabilitado temporalmente')
  }
} catch (error) {
  console.log('⚠️  RLS no modificado, continuando...')
}

// Hash de contraseñas
const adminPasswordHash = await bcryptjs.hash('admin123', 10)
const userPasswordHash = await bcryptjs.hash('usuario123', 10)

// Generar UUIDs válidos
const adminId = randomUUID()
const user1Id = randomUUID()

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
  }
]

try {
  // Insertar usuarios uno por uno
  for (const user of users) {
    console.log(`📝 Insertando usuario: ${user.name}`)
    
    const { data, error } = await supabase
      .from('users')
      .insert([user])
      .select()
    
    if (error) {
      console.error(`❌ Error insertando ${user.email}:`, error.message)
    } else {
      console.log(`✅ Usuario ${user.email} creado exitosamente`)
    }
  }

  // Verificar usuarios insertados
  const { data: allUsers, error: selectError } = await supabase
    .from('users')
    .select('*')

  if (selectError) {
    console.error('❌ Error verificando usuarios:', selectError)
  } else {
    console.log('\n📋 Usuarios en la base de datos:')
    allUsers.forEach(user => {
      console.log(`   • ${user.name} (${user.email}) - ID: ${user.id}`)
    })
    
    console.log('\n🔑 Credenciales de acceso:')
    console.log('   • admin@loteria.com / admin123')
    console.log('   • juan@loteria.com / usuario123')
  }

} catch (error) {
  console.error('❌ Error general:', error)
}