#!/usr/bin/env node

/**
 * Script para probar que los permisos de usuario funcionan correctamente
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'
const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔐 VERIFICANDO PERMISOS DE USUARIOS\n')
console.log('='.repeat(60))

async function testUserPermissions(email) {
  console.log(`\n📧 Usuario: ${email}`)
  console.log('-'.repeat(60))
  
  // 1. Buscar usuario
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, name, email, is_active')
    .eq('email', email)
    .single()
  
  if (userError || !user) {
    console.log('❌ Usuario no encontrado')
    return
  }
  
  console.log(`👤 Nombre: ${user.name}`)
  console.log(`🔑 ID: ${user.id}`)
  console.log(`✅ Activo: ${user.is_active ? 'Sí' : 'No'}`)
  
  // 2. Obtener roles asignados
  const { data: userRoles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*, roles(*)')
    .eq('user_id', user.id)
  
  if (!userRoles || userRoles.length === 0) {
    console.log('\n⚠️  No tiene roles asignados')
    return
  }
  
  console.log(`\n👥 Roles (${userRoles.length}):`)
  
  const allPermissions = new Set()
  
  userRoles.forEach((ur, index) => {
    const role = ur.roles
    console.log(`   ${index + 1}. ${role.name}`)
    console.log(`      Descripción: ${role.description}`)
    console.log(`      Sistema: ${role.is_system ? 'Sí' : 'No'}`)
    console.log(`      Permisos: ${JSON.stringify(role.permissions)}`)
    
    // Agregar permisos a la lista total
    role.permissions.forEach(p => allPermissions.add(p))
  })
  
  console.log(`\n🔓 Permisos totales (${allPermissions.size}):`)
  const permissionsArray = Array.from(allPermissions)
  
  if (permissionsArray.includes('*')) {
    console.log('   ⭐ ACCESO COMPLETO (*)')
  } else {
    permissionsArray.forEach(p => {
      console.log(`   • ${p}`)
    })
  }
  
  // Verificar qué módulos puede ver
  console.log('\n📱 Acceso a módulos:')
  const modules = [
    'dashboard',
    'reports', 
    'lotteries',
    'winners',
    'history',
    'users',
    'roles',
    'api-keys'
  ]
  
  modules.forEach(module => {
    const hasAccess = permissionsArray.includes('*') || permissionsArray.includes(module)
    console.log(`   ${hasAccess ? '✅' : '❌'} ${module}`)
  })
}

async function main() {
  // Probar diferentes usuarios
  await testUserPermissions('juan@loteria.com')
  await testUserPermissions('admin@loteria.com')
  
  console.log('\n' + '='.repeat(60))
  console.log('✅ Verificación completada\n')
}

main().catch(console.error)
