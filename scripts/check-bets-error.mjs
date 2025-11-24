#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://evtznnbjgtdvcvkxpyuw.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV2dHpubmJqZ3RkdmN2a3hweXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM0Mzg3NjYsImV4cCI6MjA0OTAxNDc2Nn0.mnndF41WJe8hBX_d9xpBP5wKBFJPKJOGmYHVB3hXP2k'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 Diagnóstico de Jugadas\n')
console.log('=' .repeat(60))

// 1. Verificar lotteries existentes
console.log('\n📋 1. Verificando loterías existentes...')
const { data: lotteries, error: lotteriesError } = await supabase
  .from('lotteries')
  .select('id, name, status')

if (lotteriesError) {
  console.log('❌ Error:', lotteriesError.message)
} else {
  console.log(`✅ Encontradas ${lotteries.length} loterías:`)
  lotteries.forEach(lot => {
    console.log(`   - ${lot.name} (${lot.id}) - Status: ${lot.status}`)
  })
}

// 2. Verificar jugadas existentes
console.log('\n📊 2. Verificando jugadas existentes...')
const { data: bets, error: betsError } = await supabase
  .from('bets')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(5)

if (betsError) {
  console.log('❌ Error:', betsError.message)
} else {
  console.log(`✅ Encontradas ${bets.length} jugadas recientes:`)
  bets.forEach(bet => {
    console.log(`   - ${bet.lottery_name}: ${bet.animal_name} (${bet.animal_number}) - $${bet.amount}`)
  })
}

// 3. Simular creación de jugada con lotería válida
if (lotteries && lotteries.length > 0) {
  console.log('\n🎯 3. Simulando creación de jugada...')
  
  const testLottery = lotteries[0]
  console.log(`   Usando lotería: ${testLottery.name}`)
  
  const testBet = {
    lottery_id: testLottery.id,
    lottery_name: testLottery.name,
    animal_number: '13',
    animal_name: 'Caballo',
    amount: 100,
    potential_win: 6400,
    is_winner: false
  }
  
  console.log('   Datos:', testBet)
  
  const { data: createdBet, error: createError } = await supabase
    .from('bets')
    .insert([testBet])
    .select()
    .single()
  
  if (createError) {
    console.log('❌ Error creando jugada:', createError.message)
    console.log('   Código:', createError.code)
    console.log('   Detalles:', createError.details)
    console.log('   Hint:', createError.hint)
  } else {
    console.log('✅ Jugada creada exitosamente!')
    console.log('   ID:', createdBet.id)
  }
} else {
  console.log('\n⚠️ No hay loterías disponibles para probar')
}

// 4. Verificar constraints de la tabla bets
console.log('\n🔐 4. Verificando constraints de la tabla bets...')
const { data: constraints, error: constraintsError } = await supabase
  .rpc('get_table_constraints', { table_name: 'bets' })
  .catch(() => null)

// Si no existe esa función, intentar con query directa
if (!constraints) {
  console.log('   ℹ️ Para ver constraints, ejecuta en SQL Editor:')
  console.log(`
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'bets'::regclass;
  `)
}

console.log('\n' + '='.repeat(60))
console.log('✅ Diagnóstico completado')
