#!/usr/bin/env node

import readline from 'readline'
import fs from 'fs'

// Configurar readline para entrada interactiva
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

// Función para hacer preguntas
function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim())
    })
  })
}

// Función para validar URL de Supabase
function validateUrl(url) {
  const urlRegex = /^https:\/\/[a-zA-Z0-9-]+\.supabase\.co$/
  return urlRegex.test(url)
}

// Función para validar API Key
function validateApiKey(key) {
  const keyRegex = /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/
  return keyRegex.test(key)
}

// Función para actualizar credenciales en un archivo
function updateCredentialsInFile(filePath, newUrl, newKey) {
  if (!fs.existsSync(filePath)) {
    return false
  }

  try {
    let content = fs.readFileSync(filePath, 'utf8')
    
    // Patrones para encontrar las credenciales actuales
    const urlPattern = /https:\/\/[a-zA-Z0-9-]+\.supabase\.co/g
    const keyPattern = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g
    
    // Reemplazar URL y API Key
    content = content.replace(urlPattern, newUrl)
    content = content.replace(keyPattern, newKey)
    
    fs.writeFileSync(filePath, content, 'utf8')
    return true
  } catch (error) {
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

async function main() {
  console.log('🚀 CONFIGURADOR AUTOMÁTICO DE SUPABASE')
  console.log('=' .repeat(60))
  console.log('')
  console.log('Este script te ayudará a configurar Supabase paso a paso.')
  console.log('¡Vamos a hacerlo juntos!')
  console.log('')

  // Paso 1: Mostrar instrucciones
  console.log('📋 PASO 1: CREAR PROYECTO SUPABASE')
  console.log('1. Ve a: https://supabase.com/dashboard')
  console.log('2. Haz clic en "New Project"')
  console.log('3. Nombre: "sistema-administrati"')
  console.log('4. Región: "South America (São Paulo)"')
  console.log('5. Contraseña: (elige una segura y guárdala)')
  console.log('6. Espera 2-3 minutos a que se cree el proyecto')
  console.log('')

  await askQuestion('✅ Presiona ENTER cuando hayas creado el proyecto...')
  console.log('')

  // Paso 2: Script SQL
  console.log('📋 PASO 2: CONFIGURAR BASE DE DATOS')
  console.log('1. Ve a "SQL Editor" en tu proyecto de Supabase')
  console.log('2. Crea una nueva query')
  console.log('3. Copia y pega el siguiente script SQL:')
  console.log('')
  console.log('═'.repeat(80))

  const sqlScript = `-- 🏗️  CONFIGURACIÓN COMPLETA - SISTEMA DE LOTERÍA
-- Copiar y pegar todo en SQL Editor de Supabase

-- Crear extensión UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 🏦 Tabla de potes
CREATE TABLE IF NOT EXISTS pots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0,
  color VARCHAR(20),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💸 Tabla de retiros
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 🔄 Tabla de transferencias
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  to_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 🎲 Tabla de loterías
CREATE TABLE IF NOT EXISTS lotteries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🎯 Tabla de apuestas  
CREATE TABLE IF NOT EXISTS bets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id),
  lottery_id UUID REFERENCES lotteries(id),
  numbers TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  type VARCHAR(50),
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 🏆 Tabla de sorteos
CREATE TABLE IF NOT EXISTS draws (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lottery_id UUID REFERENCES lotteries(id),
  lottery_name VARCHAR(100),
  winning_animal_number VARCHAR(10),
  winning_animal_name VARCHAR(100),
  draw_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  total_payout DECIMAL(10,2) DEFAULT 0,
  winners_count INTEGER DEFAULT 0
);

-- 🔒 IMPORTANTE: Desactivar RLS para desarrollo
ALTER TABLE pots DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE draws DISABLE ROW LEVEL SECURITY;

-- 📊 Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_withdrawals_from_pot ON withdrawals(from_pot);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_lottery_id ON bets(lottery_id);
CREATE INDEX IF NOT EXISTS idx_draws_lottery_id ON draws(lottery_id);

-- 💰 Datos iniciales - Potes con balance
INSERT INTO pots (name, percentage, balance, color, description) 
VALUES 
  ('Pote de Premios', 70.00, 3143.00, '#10b981', 'Reservado para pagar premios a ganadores'),
  ('Pote de Reserva', 20.00, 898.00, '#3b82f6', 'Fondo de reserva para estabilidad operativa'),
  ('Pote de Ganancias', 10.00, 449.00, '#8b5cf6', 'Ganancias del negocio disponibles para retiro')
ON CONFLICT (name) DO UPDATE SET
  percentage = EXCLUDED.percentage,
  balance = EXCLUDED.balance,
  color = EXCLUDED.color,
  description = EXCLUDED.description;

-- 🎲 Loterías de ejemplo
INSERT INTO lotteries (name, description, is_active) 
VALUES 
  ('Animalitos', 'Lotería tradicional de animalitos', true),
  ('Tripleta', 'Modalidad de tres números', true),
  ('Terminal', 'Últimos dos dígitos', true)
ON CONFLICT DO NOTHING;

-- ✅ Verificación final
SELECT 
  'pots' as tabla, 
  count(*) as registros,
  CASE WHEN count(*) = 3 THEN '✅' ELSE '❌' END as estado
FROM pots
UNION ALL
SELECT 'lotteries', count(*), CASE WHEN count(*) = 3 THEN '✅' ELSE '❌' END FROM lotteries
UNION ALL
SELECT 'withdrawals', count(*), '✅' FROM withdrawals
UNION ALL
SELECT 'transfers', count(*), '✅' FROM transfers
UNION ALL
SELECT 'bets', count(*), '✅' FROM bets
UNION ALL
SELECT 'draws', count(*), '✅' FROM draws;`

  console.log(sqlScript)
  console.log('═'.repeat(80))
  console.log('')
  console.log('4. Haz clic en "RUN" para ejecutar el script')
  console.log('5. Deberías ver una tabla con ✅ al final')
  console.log('')

  await askQuestion('✅ Presiona ENTER cuando hayas ejecutado el script SQL...')
  console.log('')

  // Paso 3: Obtener credenciales
  console.log('📋 PASO 3: OBTENER CREDENCIALES')
  console.log('1. Ve a "Settings" → "API" en tu proyecto')
  console.log('2. Busca la sección "Project API keys"')
  console.log('')

  let projectUrl = ''
  let apiKey = ''

  // Solicitar URL del proyecto
  while (true) {
    projectUrl = await askQuestion('🌐 Pega aquí tu "Project URL" (https://xxxxx.supabase.co): ')
    
    if (validateUrl(projectUrl)) {
      console.log('✅ URL válida')
      break
    } else {
      console.log('❌ URL inválida. Debe tener formato: https://xxxxx.supabase.co')
      console.log('   Ejemplo: https://abcdefghijk.supabase.co')
    }
  }

  console.log('')

  // Solicitar API Key
  while (true) {
    apiKey = await askQuestion('🔐 Pega aquí tu "anon public" API Key (empieza con eyJ...): ')
    
    if (validateApiKey(apiKey)) {
      console.log('✅ API Key válida')
      break
    } else {
      console.log('❌ API Key inválida. Debe empezar con "eyJ" y ser un JWT válido')
      console.log('   Asegúrate de copiar la clave "anon public", no la "service_role"')
    }
  }

  console.log('')

  // Paso 4: Actualizar archivos
  console.log('🔄 PASO 4: ACTUALIZANDO ARCHIVOS...')
  console.log('')

  let successCount = 0
  
  filesToUpdate.forEach(filePath => {
    const success = updateCredentialsInFile(filePath, projectUrl, apiKey)
    if (success) {
      console.log(`✅ ${filePath}`)
      successCount++
    } else {
      console.log(`⚠️  ${filePath} (no encontrado)`)
    }
  })

  console.log('')
  console.log(`📊 ACTUALIZACIÓN COMPLETA: ${successCount}/${filesToUpdate.length} archivos`)

  if (successCount > 8) { // La mayoría de archivos críticos
    console.log('')
    console.log('🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!')
    console.log('')
    console.log('🧪 VERIFICANDO CONEXIÓN...')
    
    // Crear y ejecutar prueba rápida
    const testScript = `
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('${projectUrl}', '${apiKey}')

async function quickTest() {
  try {
    console.log('🔗 Probando conexión...')
    
    const { data: pots, error } = await supabase
      .from('pots')
      .select('name, balance')
      .limit(3)
    
    if (error) {
      console.log('❌ Error:', error.message)
      return false
    }
    
    console.log('✅ ¡Conexión exitosa!')
    console.log('💰 Potes encontrados:')
    pots.forEach(pot => {
      console.log(\`   - \${pot.name}: Bs. \${pot.balance}\`)
    })
    
    return true
  } catch (err) {
    console.log('❌ Error de conexión:', err.message)
    return false
  }
}

quickTest().then(success => {
  if (success) {
    console.log('')
    console.log('🚀 ¡LISTO PARA USAR!')
    console.log('Ejecuta: npm run dev')
    console.log('Ve al Dashboard y prueba el botón "Retirar" 💸')
  }
  process.exit(success ? 0 : 1)
})
`

    fs.writeFileSync('quick-test.mjs', testScript)
    
    console.log('')
    console.log('⏳ Ejecutando prueba de conexión...')
    
    // Importar dinámicamente el módulo
    try {
      await import('./quick-test.mjs')
    } catch (error) {
      console.log('⚠️  No se pudo ejecutar la prueba automática')
      console.log('Ejecuta manualmente: node quick-test.mjs')
    }

    // Limpiar archivo temporal
    setTimeout(() => {
      if (fs.existsSync('quick-test.mjs')) {
        fs.unlinkSync('quick-test.mjs')
      }
    }, 2000)

  } else {
    console.log('')
    console.log('⚠️  Algunos archivos no se pudieron actualizar')
    console.log('Verifica que los archivos existan y tengan permisos de escritura')
  }

  rl.close()
}

// Ejecutar el script principal
main().catch(error => {
  console.log('💥 Error inesperado:', error)
  rl.close()
  process.exit(1)
})