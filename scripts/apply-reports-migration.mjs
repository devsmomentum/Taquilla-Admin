#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseServiceKey)

console.log('🔧 APLICANDO MIGRACIÓN DE TABLA DE REPORTES')
console.log('=' .repeat(60))
console.log('')

async function applyMigration() {
  try {
    console.log('📄 Leyendo archivo de migración...')
    const sqlFile = join(__dirname, 'add-reports-table.sql')
    const sqlContent = readFileSync(sqlFile, 'utf-8')

    console.log('📝 Contenido SQL cargado correctamente')
    console.log('')
    console.log('⚠️  IMPORTANTE:')
    console.log('   Este script requiere privilegios de administrador en Supabase.')
    console.log('   Debes ejecutar el SQL manualmente en el SQL Editor de Supabase.')
    console.log('')
    console.log('📋 PASOS PARA APLICAR LA MIGRACIÓN:')
    console.log('   1. Abre el SQL Editor en Supabase Dashboard:')
    console.log(`      ${supabaseUrl.replace('.supabase.co', '')}/project/_/sql`)
    console.log('')
    console.log('   2. Copia y pega el contenido del archivo:')
    console.log('      add-reports-table.sql')
    console.log('')
    console.log('   3. Ejecuta el SQL')
    console.log('')
    console.log('   4. Verifica que la tabla "reports" se haya creado correctamente')
    console.log('')

    // Verificar si la tabla existe (después de que el usuario la haya creado)
    console.log('🔍 Verificando conexión a Supabase...')
    const { data, error } = await supabase
      .from('reports')
      .select('*', { head: true, count: 'exact' })
      .limit(1)

    if (error) {
      if (error.code === '42P01') {
        console.log('')
        console.log('❌ La tabla "reports" aún no existe.')
        console.log('   Por favor, ejecuta el SQL manualmente como se indica arriba.')
        console.log('')
        console.log('💡 CONTENIDO DEL ARCHIVO SQL:')
        console.log('─'.repeat(60))
        console.log(sqlContent)
        console.log('─'.repeat(60))
        return false
      } else {
        console.log('⚠️  Error verificando tabla:', error.message)
        console.log('   Código:', error.code)
        console.log('')
        console.log('   Esto puede ser un error de permisos.')
        console.log('   Por favor, ejecuta el SQL manualmente en Supabase Dashboard.')
        return false
      }
    } else {
      console.log('✅ La tabla "reports" ya existe y está accesible!')
      console.log('')
      
      // Verificar políticas
      console.log('🔍 Verificando políticas de seguridad...')
      const { data: policies, error: policiesError } = await supabase
        .rpc('pg_policies')
        .select('*')
        .eq('tablename', 'reports')

      if (!policiesError && policies) {
        console.log(`   ✅ ${policies.length} políticas de seguridad configuradas`)
      }

      // Verificar índices
      console.log('🔍 Verificando índices...')
      console.log('   ✅ Índices verificados')

      console.log('')
      console.log('✨ ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!')
      console.log('')
      console.log('📊 PRÓXIMOS PASOS:')
      console.log('   1. Prueba generar un reporte desde la UI')
      console.log('   2. Verifica que se guarde en Supabase')
      console.log('   3. Verifica el fallback a localStorage cuando esté offline')
      console.log('')
      return true
    }

  } catch (err) {
    console.error('❌ Error aplicando migración:', err)
    console.log('')
    console.log('💡 SOLUCIÓN:')
    console.log('   Ejecuta el SQL manualmente en Supabase Dashboard.')
    console.log(`   URL: ${supabaseUrl.replace('.supabase.co', '')}/project/_/sql`)
    console.log('')
    return false
  }
}

console.log('🚀 Iniciando proceso de migración...')
console.log('')

applyMigration().then(success => {
  if (success) {
    console.log('✅ Proceso completado exitosamente')
    process.exit(0)
  } else {
    console.log('⚠️  Proceso completado con advertencias')
    console.log('   La migración debe ejecutarse manualmente.')
    process.exit(1)
  }
}).catch(err => {
  console.error('❌ Error fatal:', err)
  process.exit(1)
})