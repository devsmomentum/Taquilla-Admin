#!/usr/bin/env node

/**
 * 🔧 APLICAR FIX A LAS POLICIES DE API KEYS
 * Actualiza las policies para funcionar sin Supabase Auth
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('\n🔧 APLICANDO FIX A API KEYS POLICIES\n')
console.log('━'.repeat(80))

// Leer el archivo SQL
const sqlFile = readFileSync('./fix-apikeys-policies.sql', 'utf8')

// Dividir en statements individuales
const statements = sqlFile
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 0)

console.log(`\nEjecutando ${statements.length} sentencias SQL...\n`)

let successCount = 0
let errorCount = 0

for (let i = 0; i < statements.length; i++) {
  const statement = statements[i] + ';'
  
  // Saltar comentarios
  if (statement.startsWith('--')) continue
  
  console.log(`${i + 1}. Ejecutando...`)
  console.log(`   ${statement.substring(0, 80)}${statement.length > 80 ? '...' : ''}`)
  
  try {
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: statement })
    
    if (error) {
      // Intentar ejecutar directamente si exec_sql no existe
      const { error: directError } = await supabase
        .from('_sql_execution')
        .insert({ query: statement })
      
      if (directError) {
        console.log(`   ⚠️ No se puede ejecutar SQL directamente desde el cliente`)
        console.log(`   ${error.message}`)
        console.log(`\n   💡 Debes ejecutar el archivo fix-apikeys-policies.sql manualmente en Supabase SQL Editor`)
        console.log(`      https://supabase.com/dashboard/project/_/sql/new`)
        errorCount++
        break
      }
    }
    
    console.log(`   ✅ Ejecutado correctamente`)
    successCount++
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`)
    errorCount++
  }
  console.log('')
}

console.log('━'.repeat(80))
console.log(`\n📊 Resultado: ${successCount} exitosas, ${errorCount} errores\n`)

if (errorCount > 0) {
  console.log('⚠️ INSTRUCCIONES MANUALES:')
  console.log('   1. Abre Supabase Dashboard')
  console.log('   2. Ve a SQL Editor')
  console.log('   3. Copia y pega el contenido de fix-apikeys-policies.sql')
  console.log('   4. Ejecuta el script')
  console.log('   5. Vuelve a ejecutar node diagnose-apikeys-supabase.mjs')
  console.log('')
} else {
  console.log('✅ Policies actualizadas correctamente')
  console.log('   Ahora las API Keys se guardarán en Supabase')
  console.log('')
}

console.log('━'.repeat(80))
console.log('')
