#!/usr/bin/env node

console.log('🔍 DIAGNÓSTICO SIMPLE DE CONEXIÓN SUPABASE')
console.log('=' .repeat(50))

// Verificar si tenemos conectividad básica
console.log('\n1️⃣ Verificando conectividad básica...')

try {
  const response = await fetch('https://www.google.com')
  if (response.ok) {
    console.log('✅ Conectividad a internet: OK')
  } else {
    console.log('❌ Problema de conectividad a internet')
  }
} catch (error) {
  console.log('❌ Sin conectividad a internet:', error.message)
}

console.log('\n2️⃣ Verificando URL de Supabase...')
const supabaseUrl = 'https://twfkaxzhxinlmtyg.supabase.co'

try {
  const response = await fetch(supabaseUrl)
  console.log(`✅ URL Supabase responde: ${response.status}`)
} catch (error) {
  console.log('❌ URL Supabase no responde:', error.message)
}

console.log('\n3️⃣ Mostrando configuración actual...')
console.log('URL:', supabaseUrl)
console.log('API Key:', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZmtheHpoeGlubG10eWciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTcyODg0MjgzNywiZXhwIjoyMDQ0NDE4ODM3fQ.MNUNhNPBYr5rTH8n5lIrx5lJkL3CrgYoaZ6x7g1Vkf0'.substring(0, 50) + '...')

console.log('\n📋 INSTRUCCIONES PARA RESOLVER:')
console.log('')
console.log('Si hay problemas de conectividad:')
console.log('1. Verifica que estés conectado a internet')
console.log('2. Verifica que Supabase esté funcionando')
console.log('3. Ve a tu dashboard de Supabase y verifica que el proyecto exista')
console.log('')
console.log('Para configurar la tabla withdrawals:')
console.log('1. Ve a Supabase Dashboard > SQL Editor')
console.log('2. Ejecuta: SELECT * FROM withdrawals LIMIT 1;')
console.log('3. Si dice "relation does not exist", ejecuta:')
console.log('')
console.log('CREATE TABLE withdrawals (')
console.log('  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),')
console.log('  from_pot VARCHAR(100) NOT NULL,')
console.log('  amount DECIMAL(10,2) NOT NULL,')
console.log('  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()')
console.log(');')
console.log('')
console.log('ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;')
console.log('')
console.log('Luego ejecuta nuevamente: node test-withdrawals-module.mjs')