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

console.log('🔧 ARREGLANDO INTEGRACIÓN DEL MÓDULO DE JUGADAS\n')

async function fixBetsIntegration() {
  try {
    console.log('1️⃣ Verificando estructura de la tabla bets...')
    
    // Obtener estructura de la tabla
    const { data: tableInfo, error: infoError } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable')
      .eq('table_name', 'bets')
      .eq('table_schema', 'public')

    if (infoError) {
      console.log('❌ Error obteniendo estructura:', infoError.message)
      return
    }

    console.log('📋 Estructura de la tabla bets:')
    tableInfo.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(required)' : '(optional)'}`)
    })

    console.log('\n2️⃣ Probando inserción con UUID correcto...')
    
    // Generar UUID usando la función de PostgreSQL
    const { data: uuidData, error: uuidError } = await supabase
      .rpc('gen_random_uuid')

    if (uuidError) {
      console.log('❌ Error generando UUID:', uuidError.message)
      return
    }

    const testBet = {
      id: uuidData,
      lottery_id: uuidData, // Usar el mismo UUID para simplificar
      lottery_name: 'Lotería de Prueba',
      animal_number: '01',
      animal_name: 'Carnero',
      amount: 100,
      potential_win: 3700,
      is_winner: false
    }

    console.log('🎯 Insertando jugada de prueba con UUID:', testBet.id)

    const { data: insertData, error: insertError } = await supabase
      .from('bets')
      .insert([testBet])
      .select()

    if (insertError) {
      console.log('❌ Error insertando:', insertError.message)
      
      if (insertError.message.includes('row-level security')) {
        console.log('\n🔒 PROBLEMA: RLS está bloqueando las inserciones')
        console.log('💡 SOLUCIÓN: Ejecuta estas políticas RLS en Supabase SQL Editor:')
        console.log(`
-- Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "bets_select_policy" ON bets;
DROP POLICY IF EXISTS "bets_insert_policy" ON bets;
DROP POLICY IF EXISTS "bets_update_policy" ON bets;
DROP POLICY IF EXISTS "bets_delete_policy" ON bets;

-- Crear políticas permisivas para desarrollo
CREATE POLICY "bets_select_policy" ON bets FOR SELECT USING (true);
CREATE POLICY "bets_insert_policy" ON bets FOR INSERT WITH CHECK (true);
CREATE POLICY "bets_update_policy" ON bets FOR UPDATE USING (true);
CREATE POLICY "bets_delete_policy" ON bets FOR DELETE USING (true);

-- Habilitar RLS (si no está habilitado)
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
        `)
        return
      }
      
      if (insertError.message.includes('foreign key')) {
        console.log('\n🔗 PROBLEMA: Restricción de clave foránea')
        console.log('💡 Esto es normal - las jugadas necesitan una lotería válida')
        
        // Intentar con una lotería existente
        const { data: lotteries } = await supabase
          .from('lotteries')
          .select('id, name')
          .limit(1)

        if (lotteries && lotteries.length > 0) {
          const lottery = lotteries[0]
          console.log(`🎰 Usando lotería existente: ${lottery.name}`)
          
          const betWithValidLottery = {
            ...testBet,
            lottery_id: lottery.id,
            lottery_name: lottery.name
          }
          
          const { data: insertData2, error: insertError2 } = await supabase
            .from('bets')
            .insert([betWithValidLottery])
            .select()

          if (insertError2) {
            console.log('❌ Error con lotería válida:', insertError2.message)
          } else {
            console.log('✅ Jugada de prueba insertada correctamente')
            
            // Limpiar
            await supabase.from('bets').delete().eq('id', testBet.id)
            console.log('🧹 Jugada de prueba eliminada')
            return true
          }
        } else {
          console.log('⚠️ No hay loterías en la base de datos')
          console.log('💡 Crea una lotería primero, luego prueba las jugadas')
        }
      }
    } else {
      console.log('✅ Jugada de prueba insertada correctamente')
      console.log('📊 Datos insertados:', insertData[0])
      
      // Limpiar
      await supabase.from('bets').delete().eq('id', testBet.id)
      console.log('🧹 Jugada de prueba eliminada')
      return true
    }

  } catch (error) {
    console.error('💥 Error:', error.message)
  }
  
  return false
}

fixBetsIntegration().then(success => {
  if (success) {
    console.log('\n🎉 ¡INTEGRACIÓN DE JUGADAS FUNCIONA CORRECTAMENTE!')
  } else {
    console.log('\n⚠️ La integración necesita ajustes (ver instrucciones arriba)')
  }
})