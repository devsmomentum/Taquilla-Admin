#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Faltan las credenciales de Supabase en .env')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 VERIFICACIÓN COMPLETA DE TODOS LOS MÓDULOS\n')

async function verifyAllModules() {
  const results = {
    login: { status: '❌', score: 0, total: 4, issues: [] },
    roles: { status: '❌', score: 0, total: 5, issues: [] },
    users: { status: '❌', score: 0, total: 5, issues: [] },
    lotteries: { status: '❌', score: 0, total: 5, issues: [] },
    prizes: { status: '❌', score: 0, total: 4, issues: [] },
    bets: { status: '❌', score: 0, total: 6, issues: [] }
  }

  try {
    console.log('🔐 1. MÓDULO LOGIN/AUTENTICACIÓN')
    console.log('=' .repeat(40))
    
    // Verificar tabla users para login
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, is_active')
      .limit(1)

    if (usersError) {
      results.login.issues.push('Tabla users no accesible')
    } else {
      results.login.score += 1
      console.log('✅ Tabla users accesible')
    }

    // Verificar vista users_with_roles
    const { data: usersWithRoles, error: viewError } = await supabase
      .from('users_with_roles')
      .select('*')
      .limit(1)

    if (viewError) {
      results.login.issues.push('Vista users_with_roles no existe')
    } else {
      results.login.score += 1
      console.log('✅ Vista users_with_roles funciona')
    }

    // Verificar hook de autenticación existe
    const fs = await import('fs')
    if (fs.existsSync('./src/hooks/use-supabase-auth.ts')) {
      results.login.score += 1
      console.log('✅ Hook use-supabase-auth.ts existe')
    } else {
      results.login.issues.push('Hook de autenticación faltante')
    }

    // Verificar pantalla de login
    if (fs.existsSync('./src/components/LoginScreen.tsx')) {
      results.login.score += 1
      console.log('✅ LoginScreen.tsx existe')
    } else {
      results.login.issues.push('LoginScreen component faltante')
    }

    results.login.status = results.login.score === results.login.total ? '✅' : results.login.score > 2 ? '⚠️' : '❌'

    console.log('\n👥 2. MÓDULO ROLES')
    console.log('=' .repeat(40))

    // Verificar tabla roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('*')
      .limit(5)

    if (rolesError) {
      results.roles.issues.push('Tabla roles no accesible')
    } else {
      results.roles.score += 1
      console.log(`✅ Tabla roles accesible (${roles.length} roles encontrados)`)
    }

    // Verificar hook de roles
    if (fs.existsSync('./src/hooks/use-supabase-roles.ts')) {
      results.roles.score += 1
      console.log('✅ Hook use-supabase-roles.ts existe')
    } else {
      results.roles.issues.push('Hook de roles faltante')
    }

    // Verificar componente RoleDialog
    if (fs.existsSync('./src/components/RoleDialog.tsx')) {
      results.roles.score += 1
      console.log('✅ RoleDialog.tsx existe')
    } else {
      results.roles.issues.push('RoleDialog component faltante')
    }

    // Probar creación/lectura de roles
    try {
      const testRole = {
        name: `Test Role ${Date.now()}`,
        permissions: ['dashboard'],
        created_by: 'verification-script'
      }

      const { data: createdRole, error: createError } = await supabase
        .from('roles')
        .insert([testRole])
        .select()
        .single()

      if (createError) {
        results.roles.issues.push('No se pueden crear roles')
      } else {
        results.roles.score += 1
        console.log('✅ Creación de roles funciona')
        
        // Limpiar rol de prueba
        await supabase.from('roles').delete().eq('id', createdRole.id)
      }
    } catch (e) {
      results.roles.issues.push('Error probando CRUD de roles')
    }

    // Verificar tabla user_roles
    const { data: userRoles, error: userRolesError } = await supabase
      .from('user_roles')
      .select('*')
      .limit(1)

    if (userRolesError) {
      results.roles.issues.push('Tabla user_roles no accesible')
    } else {
      results.roles.score += 1
      console.log('✅ Tabla user_roles accesible')
    }

    results.roles.status = results.roles.score === results.roles.total ? '✅' : results.roles.score > 2 ? '⚠️' : '❌'

    console.log('\n🧑‍🤝‍🧑 3. MÓDULO USUARIOS')
    console.log('=' .repeat(40))

    // Verificar hook de usuarios
    if (fs.existsSync('./src/hooks/use-supabase-users.ts')) {
      results.users.score += 1
      console.log('✅ Hook use-supabase-users.ts existe')
    } else {
      results.users.issues.push('Hook de usuarios faltante')
    }

    // Verificar UserDialog
    if (fs.existsSync('./src/components/UserDialog.tsx')) {
      results.users.score += 1
      console.log('✅ UserDialog.tsx existe')
    } else {
      results.users.issues.push('UserDialog component faltante')
    }

    // Verificar CRUD de usuarios
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, email, is_active')

    if (allUsers && allUsers.length > 0) {
      results.users.score += 1
      console.log(`✅ ${allUsers.length} usuarios en el sistema`)
    } else {
      results.users.issues.push('No hay usuarios en el sistema')
    }

    // Probar vista users_with_roles con datos reales
    const { data: usersWithRolesData } = await supabase
      .from('users_with_roles')
      .select('*')

    if (usersWithRolesData && usersWithRolesData.length > 0) {
      results.users.score += 1
      console.log(`✅ Vista users_with_roles tiene ${usersWithRolesData.length} registros`)
    } else {
      results.users.issues.push('Vista users_with_roles sin datos')
    }

    // Verificar relaciones user_roles
    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select('*')

    if (userRolesData && userRolesData.length > 0) {
      results.users.score += 1
      console.log(`✅ ${userRolesData.length} asignaciones de roles`)
    } else {
      results.users.issues.push('No hay asignaciones de roles')
    }

    results.users.status = results.users.score === results.users.total ? '✅' : results.users.score > 2 ? '⚠️' : '❌'

    console.log('\n🎰 4. MÓDULO LOTERÍAS')
    console.log('=' .repeat(40))

    // Verificar tabla lotteries
    const { data: lotteries, error: lotteriesError } = await supabase
      .from('lotteries')
      .select('*')

    if (lotteriesError) {
      results.lotteries.issues.push('Tabla lotteries no accesible')
    } else {
      results.lotteries.score += 1
      const activeLotteries = lotteries.filter(l => l.is_active)
      console.log(`✅ ${lotteries.length} loterías (${activeLotteries.length} activas)`)
    }

    // Verificar hook de loterías
    if (fs.existsSync('./src/hooks/use-supabase-lotteries.ts')) {
      results.lotteries.score += 1
      console.log('✅ Hook use-supabase-lotteries.ts existe')
    } else {
      results.lotteries.issues.push('Hook de loterías faltante')
    }

    // Verificar LotteryDialog
    if (fs.existsSync('./src/components/LotteryDialog.tsx')) {
      results.lotteries.score += 1
      console.log('✅ LotteryDialog.tsx existe')
    } else {
      results.lotteries.issues.push('LotteryDialog component faltante')
    }

    // Verificar que las loterías tienen premios
    if (lotteries && lotteries.length > 0) {
      const lotteryWithPrizes = lotteries[0]
      const { data: prizes } = await supabase
        .from('prizes')
        .select('*')
        .eq('lottery_id', lotteryWithPrizes.id)

      if (prizes && prizes.length > 0) {
        results.lotteries.score += 1
        console.log(`✅ Lotería "${lotteryWithPrizes.name}" tiene ${prizes.length} premios`)
      } else {
        results.lotteries.issues.push('Loterías sin premios configurados')
      }
    }

    // Probar creación de lotería
    try {
      const testLottery = {
        name: `Test Lottery ${Date.now()}`,
        closing_time: '18:00',
        draw_time: '19:00',
        is_active: true,
        created_by: 'verification-script'
      }

      const { data: createdLottery, error: createLotteryError } = await supabase
        .from('lotteries')
        .insert([testLottery])
        .select()
        .single()

      if (createLotteryError) {
        results.lotteries.issues.push('No se pueden crear loterías')
      } else {
        results.lotteries.score += 1
        console.log('✅ Creación de loterías funciona')
        
        // Limpiar
        await supabase.from('lotteries').delete().eq('id', createdLottery.id)
      }
    } catch (e) {
      results.lotteries.issues.push('Error probando CRUD de loterías')
    }

    results.lotteries.status = results.lotteries.score === results.lotteries.total ? '✅' : results.lotteries.score > 2 ? '⚠️' : '❌'

    console.log('\n🏆 5. MÓDULO PREMIOS')
    console.log('=' .repeat(40))

    // Verificar tabla prizes
    const { data: allPrizes, error: prizesError } = await supabase
      .from('prizes')
      .select('*')

    if (prizesError) {
      results.prizes.issues.push('Tabla prizes no accesible')
    } else {
      results.prizes.score += 1
      console.log(`✅ ${allPrizes.length} premios configurados`)
    }

    // Verificar que hay premios para animales
    const animalCounts = {}
    allPrizes.forEach(prize => {
      animalCounts[prize.animal_number] = (animalCounts[prize.animal_number] || 0) + 1
    })

    if (Object.keys(animalCounts).length >= 10) {
      results.prizes.score += 1
      console.log(`✅ Premios configurados para ${Object.keys(animalCounts).length} animales`)
    } else {
      results.prizes.issues.push('Pocos animales con premios configurados')
    }

    // Verificar multiplicadores
    const validMultipliers = allPrizes.filter(p => p.multiplier > 0)
    if (validMultipliers.length === allPrizes.length) {
      results.prizes.score += 1
      console.log('✅ Todos los premios tienen multiplicadores válidos')
    } else {
      results.prizes.issues.push('Algunos premios tienen multiplicadores inválidos')
    }

    // Probar creación de premio
    if (lotteries && lotteries.length > 0) {
      try {
        const testPrize = {
          lottery_id: lotteries[0].id,
          animal_number: '99',
          animal_name: 'Test Animal',
          multiplier: 37
        }

        const { data: createdPrize, error: createPrizeError } = await supabase
          .from('prizes')
          .insert([testPrize])
          .select()
          .single()

        if (createPrizeError) {
          results.prizes.issues.push('No se pueden crear premios')
        } else {
          results.prizes.score += 1
          console.log('✅ Creación de premios funciona')
          
          // Limpiar
          await supabase.from('prizes').delete().eq('id', createdPrize.id)
        }
      } catch (e) {
        results.prizes.issues.push('Error probando CRUD de premios')
      }
    }

    results.prizes.status = results.prizes.score === results.prizes.total ? '✅' : results.prizes.score > 2 ? '⚠️' : '❌'

    console.log('\n🎲 6. MÓDULO JUGADAS/BETS')
    console.log('=' .repeat(40))

    // Verificar tabla bets
    const { data: allBets, error: betsError } = await supabase
      .from('bets')
      .select('*')

    if (betsError) {
      results.bets.issues.push('Tabla bets no accesible')
    } else {
      results.bets.score += 1
      console.log(`✅ ${allBets.length} jugadas registradas`)
    }

    // Verificar hook de jugadas
    if (fs.existsSync('./src/hooks/use-supabase-bets.ts')) {
      results.bets.score += 1
      console.log('✅ Hook use-supabase-bets.ts existe')
    } else {
      results.bets.issues.push('Hook de jugadas faltante')
    }

    // Verificar BetDialog
    if (fs.existsSync('./src/components/BetDialog.tsx')) {
      results.bets.score += 1
      console.log('✅ BetDialog.tsx existe')
    } else {
      results.bets.issues.push('BetDialog component faltante')
    }

    // Probar creación de jugada
    if (lotteries && lotteries.length > 0) {
      try {
        const testBet = {
          lottery_id: lotteries[0].id,
          lottery_name: lotteries[0].name,
          animal_number: '01',
          animal_name: 'Carnero',
          amount: 100,
          potential_win: 3700,
          is_winner: false
        }

        const { data: createdBet, error: createBetError } = await supabase
          .from('bets')
          .insert([testBet])
          .select()
          .single()

        if (createBetError) {
          results.bets.issues.push('No se pueden crear jugadas')
        } else {
          results.bets.score += 1
          console.log('✅ Creación de jugadas funciona')
          
          // Probar actualización (marcar como ganador)
          const { error: updateError } = await supabase
            .from('bets')
            .update({ is_winner: true })
            .eq('id', createdBet.id)

          if (!updateError) {
            results.bets.score += 1
            console.log('✅ Actualización de jugadas funciona')
          } else {
            results.bets.issues.push('No se pueden actualizar jugadas')
          }
          
          // Limpiar
          await supabase.from('bets').delete().eq('id', createdBet.id)
        }
      } catch (e) {
        results.bets.issues.push('Error probando CRUD de jugadas')
      }
    }

    // Verificar que la consulta del hook funciona (sin JOIN problemático)
    const { data: betsQuery, error: queryError } = await supabase
      .from('bets')
      .select(`
        id,
        lottery_id,
        lottery_name,
        animal_number,
        animal_name,
        amount,
        potential_win,
        is_winner,
        created_at
      `)
      .order('created_at', { ascending: false })

    if (queryError) {
      results.bets.issues.push('Consulta del hook tiene problemas')
    } else {
      results.bets.score += 1
      console.log('✅ Consulta del hook funciona correctamente')
    }

    results.bets.status = results.bets.score === results.bets.total ? '✅' : results.bets.score > 2 ? '⚠️' : '❌'

  } catch (error) {
    console.error('💥 Error general en verificación:', error.message)
  }

  // Resumen final
  console.log('\n' + '='.repeat(70))
  console.log('📊 RESUMEN COMPLETO DE INTEGRACIÓN')
  console.log('='.repeat(70))

  const modules = [
    { name: 'Login/Autenticación', ...results.login },
    { name: 'Roles', ...results.roles },
    { name: 'Usuarios', ...results.users },
    { name: 'Loterías', ...results.lotteries },
    { name: 'Premios', ...results.prizes },
    { name: 'Jugadas/Bets', ...results.bets }
  ]

  modules.forEach((module, index) => {
    const percentage = Math.round((module.score / module.total) * 100)
    console.log(`${index + 1}. ${module.status} ${module.name}: ${module.score}/${module.total} (${percentage}%)`)
    
    if (module.issues.length > 0) {
      module.issues.forEach(issue => {
        console.log(`    ⚠️ ${issue}`)
      })
    }
  })

  const totalScore = modules.reduce((sum, m) => sum + m.score, 0)
  const totalPossible = modules.reduce((sum, m) => sum + m.total, 0)
  const overallPercentage = Math.round((totalScore / totalPossible) * 100)

  console.log('\n🎯 PUNTUACIÓN GENERAL:', `${totalScore}/${totalPossible} (${overallPercentage}%)`)

  if (overallPercentage >= 90) {
    console.log('🎉 ¡EXCELENTE! Todos los módulos están bien integrados')
  } else if (overallPercentage >= 75) {
    console.log('👍 BUENO: La mayoría de módulos funcionan correctamente')
  } else if (overallPercentage >= 50) {
    console.log('⚠️ PARCIAL: Algunos módulos necesitan atención')
  } else {
    console.log('❌ CRÍTICO: Múltiples problemas de integración')
  }

  console.log('\n🚀 MÓDULOS LISTOS PARA PRODUCCIÓN:')
  modules.filter(m => m.status === '✅').forEach(m => {
    console.log(`   ✅ ${m.name}`)
  })

  if (modules.some(m => m.status !== '✅')) {
    console.log('\n⚠️ MÓDULOS QUE NECESITAN ATENCIÓN:')
    modules.filter(m => m.status !== '✅').forEach(m => {
      console.log(`   ${m.status} ${m.name} (${Math.round((m.score/m.total)*100)}%)`)
    })
  }
}

verifyAllModules()