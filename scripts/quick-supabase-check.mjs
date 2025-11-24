#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'

// Usar las credenciales actuales para verificar qué tenemos
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔍 VERIFICANDO ESTADO DE SUPABASE')
console.log('=' .repeat(50))
console.log(`🌐 URL: ${supabaseUrl}`)
console.log(`🔑 Key: ${supabaseKey.substring(0, 30)}...`)
console.log('')

async function checkStatus() {
  try {
    console.log('1️⃣ Verificando conexión básica...')
    
    // Probar conexión con una consulta simple
    const { data, error, status } = await supabase
      .from('pots')
      .select('name, balance')
      .limit(1)
    
    if (error) {
      console.log(`❌ Error (${status}):`, error.message)
      
      if (error.message.includes('Invalid API key')) {
        console.log('')
        console.log('🔑 SOLUCIÓN: Necesitas la API key correcta')
        console.log('1. Ve a tu proyecto Supabase')
        console.log('2. Settings → API')
        console.log('3. Copia "anon public" key')
        console.log('4. Reemplaza en el archivo .env')
      } else if (error.message.includes('relation') && error.message.includes('does not exist')) {
        console.log('')
        console.log('📋 SOLUCIÓN: Ejecuta el script SQL')
        console.log('1. Ve al SQL Editor de Supabase')
        console.log('2. Copia y pega supabase-setup-script.sql')
        console.log('3. Ejecuta el script')
      } else {
        console.log('')
        console.log('🔧 Error desconocido. Revisa tu proyecto Supabase')
      }
      
      return false
    }
    
    console.log('✅ Conexión exitosa!')
    console.log('📊 Datos encontrados:', data)
    
    // Si llegamos aquí, todo está bien
    console.log('')
    console.log('2️⃣ Verificando todas las tablas...')
    
    const tables = ['pots', 'withdrawals', 'transfers', 'lotteries', 'bets', 'draws']
    
    for (const table of tables) {
      try {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .limit(1)
        
        if (error) {
          console.log(`❌ ${table}: ${error.message}`)
        } else {
          console.log(`✅ ${table}: OK (${data.length} registros visibles)`)
        }
      } catch (err) {
        console.log(`❌ ${table}: Error de conexión`)
      }
    }
    
    console.log('')
    console.log('🎉 ¡SUPABASE ESTÁ FUNCIONANDO!')
    console.log('El botón de retiros debería funcionar ahora.')
    
    return true
    
  } catch (err) {
    console.log('💥 Error inesperado:', err.message)
    return false
  }
}

checkStatus().then(success => {
  if (success) {
    console.log('')
    console.log('✅ TODO LISTO - Prueba la aplicación!')
    console.log('npm run dev')
  }
  process.exit(success ? 0 : 1)
})