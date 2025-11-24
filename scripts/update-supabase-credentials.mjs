#!/usr/bin/env node

import fs from 'fs'
import path from 'path'

// Función para actualizar credenciales en un archivo
function updateCredentials(filePath, newUrl, newKey) {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Archivo no encontrado: ${filePath}`)
    return false
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Patrones para encontrar las credenciales actuales
    const urlPattern = /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/g
    const keyPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
    
    // Reemplazar URL
    content = content.replace(urlPattern, newUrl)
    
    // Reemplazar API Key
    content = content.replace(keyPattern, newKey)
    
    fs.writeFileSync(filePath, content, 'utf8')
    console.log(`✅ Actualizado: ${filePath}`)
    return true
  } catch (error) {
    console.log(`❌ Error actualizando ${filePath}:`, error.message)
    return false
  }
}

// Lista de archivos a actualizar
const filesToUpdate = [
  'src/hooks/use-supabase-auth.ts',
  'src/hooks/use-supabase-bets.ts',
  'src/hooks/use-supabase-draws.ts',
  'src/hooks/use-supabase-lotteries.ts',
  'src/hooks/use-supabase-pots.ts',
  'src/hooks/use-supabase-roles.ts',
  'src/hooks/use-supabase-users.ts',
  'src/hooks/use-supabase-withdrawals.ts',
  'test-withdrawals-module.mjs',
  'test-pots-integration.mjs',
  'diagnose-supabase.mjs'
]

function updateAllCredentials(newUrl, newKey) {
  console.log('🔄 ACTUALIZANDO CREDENCIALES DE SUPABASE')
  console.log('=' .repeat(50))
  console.log(`🌐 Nueva URL: ${newUrl}`)
  console.log(`🔐 Nueva Key: ${newKey.substring(0, 20)}...`)
  console.log('')

  let successCount = 0
  let totalFiles = filesToUpdate.length

  filesToUpdate.forEach(filePath => {
    if (updateCredentials(filePath, newUrl, newKey)) {
      successCount++
    }
  })

  console.log('')
  console.log(`📊 RESULTADO: ${successCount}/${totalFiles} archivos actualizados`)
  
  if (successCount === totalFiles) {
    console.log('🎉 ¡TODAS LAS CREDENCIALES ACTUALIZADAS!')
    console.log('')
    console.log('🧪 PRÓXIMOS PASOS:')
    console.log('1. node diagnose-supabase.mjs     # Verificar conexión')
    console.log('2. node test-withdrawals-module.mjs  # Probar retiros')
    console.log('3. npm run dev                    # Iniciar aplicación')
    console.log('')
    console.log('✨ El botón de retiros debería funcionar perfectamente!')
  } else {
    console.log('⚠️  Algunos archivos no se pudieron actualizar')
    console.log('Verifica que existan y tengan permisos de escritura')
  }
}

// Función para validar formato de credenciales
function validateCredentials(url, key) {
  const urlRegex = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/
  const keyRegex = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/

  if (!urlRegex.test(url)) {
    console.log('❌ URL inválida. Debe ser: https://tu-proyecto.supabase.co')
    return false
  }

  if (!keyRegex.test(key)) {
    console.log('❌ API Key inválida. Debe empezar con eyJ y tener formato JWT')
    return false
  }

  return true
}

// Script principal
const args = process.argv.slice(2)

if (args.length !== 2) {
  console.log('🚀 ACTUALIZADOR DE CREDENCIALES SUPABASE')
  console.log('=' .repeat(50))
  console.log('')
  console.log('📋 USO:')
  console.log('node update-supabase-credentials.mjs <URL> <API_KEY>')
  console.log('')
  console.log('📝 EJEMPLO:')
  console.log('node update-supabase-credentials.mjs \\')
  console.log('  "https://abcdefgh.supabase.co" \\')
  console.log('  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."')
  console.log('')
  console.log('💡 OBTENER CREDENCIALES:')
  console.log('1. Ve a tu dashboard de Supabase')
  console.log('2. Settings > API')
  console.log('3. Copia "Project URL" y "anon public" key')
  process.exit(1)
}

const [newUrl, newKey] = args

console.log('🔍 VALIDANDO CREDENCIALES...')
if (!validateCredentials(newUrl, newKey)) {
  process.exit(1)
}

console.log('✅ Credenciales válidas')
console.log('')

updateAllCredentials(newUrl, newKey)