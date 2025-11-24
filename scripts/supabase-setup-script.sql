-- 🚀 SCRIPT COMPLETO PARA SUPABASE - SISTEMA DE LOTERÍA
-- Copia y pega todo este script en el SQL Editor de Supabase

-- ========================================
-- 1️⃣ EXTENSIONES NECESARIAS
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- 2️⃣ CREAR TODAS LAS TABLAS
-- ========================================

-- 🏦 Tabla de potes (balances del sistema)
CREATE TABLE IF NOT EXISTS pots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0,
  color VARCHAR(20),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 💸 Tabla de retiros (lo que necesitas para el botón)
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 🔄 Tabla de transferencias entre potes
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

-- ========================================
-- 3️⃣ DESACTIVAR RLS (MUY IMPORTANTE)
-- ========================================
ALTER TABLE pots DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;
ALTER TABLE lotteries DISABLE ROW LEVEL SECURITY;
ALTER TABLE bets DISABLE ROW LEVEL SECURITY;
ALTER TABLE draws DISABLE ROW LEVEL SECURITY;

-- ========================================
-- 4️⃣ CREAR ÍNDICES PARA RENDIMIENTO
-- ========================================
CREATE INDEX IF NOT EXISTS idx_withdrawals_from_pot ON withdrawals(from_pot);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bets_user_id ON bets(user_id);
CREATE INDEX IF NOT EXISTS idx_bets_lottery_id ON bets(lottery_id);
CREATE INDEX IF NOT EXISTS idx_draws_lottery_id ON draws(lottery_id);

-- ========================================
-- 5️⃣ INSERTAR DATOS INICIALES
-- ========================================

-- 💰 Potes con balance inicial para probar retiros
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

-- ========================================
-- 6️⃣ VERIFICACIÓN FINAL
-- ========================================
SELECT 
  'RESULTADO' as tipo,
  '✅ SCRIPT COMPLETADO' as mensaje;

SELECT 
  'pots' as tabla, 
  count(*) as registros,
  CASE WHEN count(*) >= 3 THEN '✅ OK' ELSE '❌ ERROR' END as estado
FROM pots
UNION ALL
SELECT 'withdrawals', count(*), '✅ OK' FROM withdrawals
UNION ALL
SELECT 'transfers', count(*), '✅ OK' FROM transfers
UNION ALL
SELECT 'lotteries', count(*), CASE WHEN count(*) >= 3 THEN '✅ OK' ELSE '❌ ERROR' END FROM lotteries
UNION ALL
SELECT 'bets', count(*), '✅ OK' FROM bets
UNION ALL
SELECT 'draws', count(*), '✅ OK' FROM draws;

-- ========================================
-- ✨ ¡LISTO! TU BASE DE DATOS ESTÁ CONFIGURADA
-- ========================================