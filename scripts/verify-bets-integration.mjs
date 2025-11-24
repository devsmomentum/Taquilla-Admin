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

console.log('🎯 VERIFICANDO INTEGRACIÓN DEL MÓDULO DE JUGADAS/BETS\n')

async function verifyBetsIntegration() {
  const results = {
    tableExists: false,
    canRead: false,
    canInsert: false,
    dataExists: false,
    hookExists: false,
    uiExists: false
  }

  try {
    console.log('1️⃣ Verificando tabla bets...')
    
    // Verificar si la tabla existe y podemos leer
    const { data: bets, error: readError } = await supabase
      .from('bets')
      .select('*')
      .limit(5)

    if (readError) {
      console.log('❌ Error leyendo tabla bets:', readError.message)
      
      if (readError.code === 'PGRST116') {
        console.log('📋 La tabla bets no existe')
      } else if (readError.message.includes('row-level security')) {
        console.log('🔒 RLS está bloqueando la lectura')
        results.tableExists = true
      }
    } else {
      console.log('✅ Tabla bets existe y es legible')
      results.tableExists = true
      results.canRead = true
      results.dataExists = bets && bets.length > 0
      
      if (results.dataExists) {
        console.log(`📊 ${bets.length} jugadas encontradas en la base de datos`)
        console.log('   Ejemplo:', bets[0])
      } else {
        console.log('📋 No hay jugadas en la base de datos (normal para instalación nueva)')
      }
    }

    console.log('\n2️⃣ Probando inserción de jugada de prueba...')
    
    // Intentar crear una jugada de prueba
    const testBet = {
      id: `test-${Date.now()}`,
      lottery_id: 'test-lottery',
      lottery_name: 'Lotería de Prueba',
      animal_number: '01',
      animal_name: 'Carnero',
      amount: 100,
      potential_win: 3700,
      is_winner: false
    }

    const { data: insertData, error: insertError } = await supabase
      .from('bets')
      .insert([testBet])
      .select()

    if (insertError) {
      console.log('❌ Error insertando jugada de prueba:', insertError.message)
      
      if (insertError.message.includes('row-level security')) {
        console.log('🔒 RLS está bloqueando la inserción')
        console.log('💡 Necesitas políticas RLS permisivas para desarrollo:')
        console.log(`
DROP POLICY IF EXISTS "bets_select_policy" ON bets;
DROP POLICY IF EXISTS "bets_insert_policy" ON bets;

-- Políticas permisivas para desarrollo
CREATE POLICY "bets_select_policy" ON bets FOR SELECT USING (true);
CREATE POLICY "bets_insert_policy" ON bets FOR INSERT WITH CHECK (true);
CREATE POLICY "bets_update_policy" ON bets FOR UPDATE USING (true);
CREATE POLICY "bets_delete_policy" ON bets FOR DELETE USING (true);
        `)
      }
    } else {
      console.log('✅ Jugada de prueba insertada correctamente')
      results.canInsert = true
      
      // Limpiar jugada de prueba
      await supabase
        .from('bets')
        .delete()
        .eq('id', testBet.id)
      console.log('🧹 Jugada de prueba eliminada')
    }

    console.log('\n3️⃣ Verificando hook useSupabaseBets...')
    
    // Verificar si el hook existe
    try {
      const fs = await import('fs')
      const hookPath = './src/hooks/use-supabase-bets.ts'
      
      if (fs.existsSync(hookPath)) {
        console.log('✅ Hook useSupabaseBets encontrado')
        results.hookExists = true
        
        const hookContent = fs.readFileSync(hookPath, 'utf8')
        
        // Verificar funciones clave
        const functions = [
          'loadBets',
          'createBet', 
          'updateBet',
          'deleteBet',
          'markWinners',
          'getBetStats'
        ]
        
        functions.forEach(func => {
          if (hookContent.includes(func)) {
            console.log(`   ✅ Función ${func} implementada`)
          } else {
            console.log(`   ❌ Función ${func} faltante`)
          }
        })
      } else {
        console.log('❌ Hook useSupabaseBets no encontrado')
      }
    } catch (err) {
      console.log('⚠️ Error verificando hook:', err.message)
    }

    console.log('\n4️⃣ Verificando BetDialog...')
    
    try {
      const fs = await import('fs')
      const dialogPath = './src/components/BetDialog.tsx'
      
      if (fs.existsSync(dialogPath)) {
        console.log('✅ BetDialog encontrado')
        results.uiExists = true
        
        const dialogContent = fs.readFileSync(dialogPath, 'utf8')
        
        if (dialogContent.includes('useSupabaseBets')) {
          console.log('   ✅ BetDialog usa el hook de Supabase')
        } else {
          console.log('   ❌ BetDialog no está integrado con Supabase')
        }
        
        if (dialogContent.includes('createBet')) {
          console.log('   ✅ BetDialog llama a createBet')
        } else {
          console.log('   ❌ BetDialog no usa createBet')
        }
      } else {
        console.log('❌ BetDialog no encontrado')
      }
    } catch (err) {
      console.log('⚠️ Error verificando BetDialog:', err.message)
    }

  } catch (error) {
    console.error('💥 Error general:', error.message)
  }

  // Resumen
  console.log('\n📋 RESUMEN DE LA INTEGRACIÓN:')
  console.log('================================')
  console.log(`Tabla bets existe: ${results.tableExists ? '✅' : '❌'}`)
  console.log(`Puede leer jugadas: ${results.canRead ? '✅' : '❌'}`)
  console.log(`Puede crear jugadas: ${results.canInsert ? '✅' : '❌'}`)
  console.log(`Tiene datos: ${results.dataExists ? '✅' : '📋 (vacío)'}`)
  console.log(`Hook implementado: ${results.hookExists ? '✅' : '❌'}`)
  console.log(`UI integrada: ${results.uiExists ? '✅' : '❌'}`)
  
  const completionScore = Object.values(results).filter(r => r === true).length
  const totalScore = Object.keys(results).length - 1 // No contar dataExists como requisito
  
  console.log(`\n🎯 PUNTUACIÓN: ${completionScore}/${totalScore} (${Math.round(completionScore/totalScore*100)}%)`)
  
  if (completionScore === totalScore) {
    console.log('🎉 ¡MÓDULO DE JUGADAS COMPLETAMENTE INTEGRADO!')
  } else {
    console.log('⚠️ Módulo de jugadas necesita más trabajo')
  }
}

verifyBetsIntegration()