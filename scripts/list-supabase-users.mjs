#!/usr/bin/env node

/**
 * 🔍 LISTAR USUARIOS EN SUPABASE
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY // Necesitamos service key para admin

if (!supabaseServiceKey) {
  console.log('\n⚠️ No hay VITE_SUPABASE_SERVICE_ROLE_KEY configurada')
  console.log('   Intentando con ANON_KEY...\n')
}

const supabase = createClient(
  supabaseUrl, 
  supabaseServiceKey || process.env.VITE_SUPABASE_ANON_KEY
)

console.log('\n👥 USUARIOS EN SUPABASE\n')
console.log('━'.repeat(80))

// 1. Leer de la tabla users
console.log('\n1️⃣ Usuarios en la tabla "users"...')
try {
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error leyendo tabla users:', error.message)
    console.log('   Esto puede deberse a RLS o permisos')
  } else {
    if (!users || users.length === 0) {
      console.log('⚠️ No hay usuarios en la tabla "users"')
      console.log('   Los usuarios deben crearse desde la aplicación')
    } else {
      console.log(`✅ Se encontraron ${users.length} usuarios:\n`)
      users.forEach((user, idx) => {
        console.log(`   ${idx + 1}. ${user.name}`)
        console.log(`      Email: ${user.email}`)
        console.log(`      ID: ${user.id}`)
        console.log(`      Activo: ${user.is_active ? 'Sí' : 'No'}`)
        console.log(`      Roles: ${user.role_ids ? user.role_ids.join(', ') : 'Sin roles'}`)
        console.log(`      Creado: ${new Date(user.created_at).toLocaleString()}`)
        console.log('')
      })
    }
  }
} catch (err) {
  console.error('❌ Error:', err.message)
}

// 2. Información sobre Auth Users (si tenemos service key)
if (supabaseServiceKey) {
  console.log('\n2️⃣ Usuarios en Supabase Auth...')
  try {
    const { data: { users: authUsers }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error('❌ Error listando usuarios de Auth:', error.message)
    } else {
      if (!authUsers || authUsers.length === 0) {
        console.log('⚠️ No hay usuarios en Supabase Auth')
      } else {
        console.log(`✅ Se encontraron ${authUsers.length} usuarios en Auth:\n`)
        authUsers.forEach((user, idx) => {
          console.log(`   ${idx + 1}. ${user.email || 'Sin email'}`)
          console.log(`      ID: ${user.id}`)
          console.log(`      Verificado: ${user.email_confirmed_at ? 'Sí' : 'No'}`)
          console.log(`      Último login: ${user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleString() : 'Nunca'}`)
          console.log('')
        })
      }
    }
  } catch (err) {
    console.log('⚠️ No se puede listar usuarios de Auth (necesita service key)')
  }
} else {
  console.log('\n2️⃣ Para ver usuarios de Auth necesitas VITE_SUPABASE_SERVICE_ROLE_KEY')
}

console.log('\n━'.repeat(80))
console.log('\n💡 NOTAS IMPORTANTES:')
console.log('   - La tabla "users" es donde la app guarda los usuarios')
console.log('   - Supabase Auth es el sistema de autenticación')
console.log('   - Para crear API Keys necesitas estar logueado en Auth')
console.log('   - El hook use-supabase-auth.ts maneja la sincronización')
console.log('\n━'.repeat(80))
console.log('')
