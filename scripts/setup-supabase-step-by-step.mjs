#!/usr/bin/env node

console.log('🚀 CONFIGURADOR AUTOMÁTICO DE SUPABASE')
console.log('=' .repeat(50))

console.log('\n📋 PASOS QUE NECESITAS HACER:')
console.log('')

console.log('1️⃣ CREAR PROYECTO SUPABASE:')
console.log('   🌐 Ve a: https://supabase.com/dashboard')
console.log('   📝 Clic en "New Project"')
console.log('   📛 Nombre: "sistema-administrati"')
console.log('   🔑 Contraseña DB: (elige una fuerte y guárdala)')
console.log('   🌍 Región: South America (São Paulo) - más cercana')
console.log('   ⏱️  Espera 2-3 minutos a que se cree')

console.log('\n2️⃣ OBTENER CREDENCIALES:')
console.log('   ⚙️  Ve a Settings > API en tu proyecto')
console.log('   📋 Copia "Project URL" (algo como: https://xxxxx.supabase.co)')
console.log('   🔐 Copia "anon public" API Key (empieza con eyJ...)')

console.log('\n3️⃣ CONFIGURAR TABLAS:')
console.log('   💾 Ve a SQL Editor en tu dashboard')
console.log('   📝 Pega y ejecuta el siguiente script:')

const sqlScript = `
-- 🏗️  SCRIPT DE CONFIGURACIÓN COMPLETA
-- Copiar y pegar todo esto en SQL Editor de Supabase

-- Crear extensión UUID si no existe
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

-- 🔒 Desactivar RLS para desarrollo (MUY IMPORTANTE)
ALTER TABLE pots DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE draws DISABLE ROW LEVEL SECURITY;

-- 📊 Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_withdrawals_from_pot ON withdrawals(from_pot);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_lottery_id ON bets(lottery_id);
CREATE INDEX IF NOT EXISTS idx_draws_lottery_id ON draws(lottery_id);

-- 💰 Insertar potes iniciales
INSERT INTO pots (name, percentage, balance, color, description) 
VALUES 
  ('Pote de Premios', 70.00, 3143.00, '#10b981', 'Reservado para pagar premios a ganadores'),
  ('Pote de Reserva', 20.00, 898.00, '#3b82f6', 'Fondo de reserva para estabilidad operativa'),
  ('Pote de Ganancias', 10.00, 449.00, '#8b5cf6', 'Ganancias del negocio disponibles para retiro')
ON CONFLICT (name) DO UPDATE SET
  percentage = EXCLUDED.percentage,
  color = EXCLUDED.color,
  description = EXCLUDED.description;

-- 🎲 Insertar loterías de ejemplo
INSERT INTO lotteries (name, description, is_active) 
VALUES 
  ('Animalitos', 'Lotería tradicional de animalitos', true),
  ('Tripleta', 'Modalidad de tres números', true),
  ('Terminal', 'Últimos dos dígitos', true)
ON CONFLICT DO NOTHING;

-- ✅ Verificar que todo se creó correctamente
SELECT 'pots' as tabla, count(*) as registros FROM pots
UNION ALL
SELECT 'withdrawals', count(*) FROM withdrawals  
UNION ALL
SELECT 'transfers', count(*) FROM transfers
UNION ALL
SELECT 'lotteries', count(*) FROM lotteries
UNION ALL
SELECT 'bets', count(*) FROM bets
UNION ALL
SELECT 'draws', count(*) FROM draws;
`

console.log(sqlScript)

console.log('\n4️⃣ DESPUÉS DE EJECUTAR EL SCRIPT:')
console.log('   ✅ Deberías ver una tabla con el conteo de registros')
console.log('   📊 pots: 3, lotteries: 3, otros: 0')

console.log('\n5️⃣ OBTENER CREDENCIALES:')
console.log('   📋 Regresa a Settings > API')
console.log('   📝 Anota:')
console.log('      - Project URL: https://[tu-proyecto].supabase.co')
console.log('      - anon public key: eyJ...')

console.log('\n6️⃣ CONFIGURAR EN EL CÓDIGO:')
console.log('   🔧 Yo actualizaré automáticamente todos los archivos')
console.log('   📝 Solo dame la URL y la API Key')

console.log('\n💡 ¡LISTO PARA EL SIGUIENTE PASO!')
console.log('   Una vez que tengas las credenciales, dímelas y actualizo todo automáticamente.')
console.log('')
console.log('📋 FORMATO:')
console.log('   URL: https://tu-proyecto.supabase.co')
console.log('   KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')