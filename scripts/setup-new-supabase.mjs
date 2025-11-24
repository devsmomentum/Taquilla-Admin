#!/usr/bin/env node

console.log('🚀 GUÍA PARA CREAR NUEVO PROYECTO SUPABASE')
console.log('=' .repeat(50))

console.log('\n📋 PASOS A SEGUIR:')
console.log('')
console.log('1️⃣ CREAR PROYECTO SUPABASE:')
console.log('   - Ve a https://supabase.com')
console.log('   - Inicia sesión o crea cuenta')
console.log('   - Clic en "New project"')
console.log('   - Nombre: "sistema-administrati"')
console.log('   - Contraseña de base de datos: (guárdala bien)')
console.log('   - Región: elegir la más cercana')

console.log('\n2️⃣ OBTENER CREDENCIALES:')
console.log('   - Ve a Settings > API')
console.log('   - Copia la "Project URL"')
console.log('   - Copia la "anon public" API key')

console.log('\n3️⃣ ACTUALIZAR CONFIGURACIÓN:')
console.log('   Reemplaza en todos los archivos:')
console.log('   - URL vieja: https://twfkaxzhxinlmtyg.supabase.co')
console.log('   - API Key vieja: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')
console.log('   Por las nuevas credenciales')

console.log('\n4️⃣ CREAR TABLAS:')
console.log('   En el SQL Editor de Supabase, ejecuta:')

console.log(`
-- Crear tabla de potes
CREATE TABLE pots (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  percentage DECIMAL(5,2) NOT NULL,
  balance DECIMAL(10,2) DEFAULT 0,
  color VARCHAR(20),
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de retiros  
CREATE TABLE withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Crear tabla de transferencias
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  to_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

-- Desactivar RLS para desarrollo
ALTER TABLE pots DISABLE ROW LEVEL SECURITY;
ALTER TABLE withdrawals DISABLE ROW LEVEL SECURITY;
ALTER TABLE transfers DISABLE ROW LEVEL SECURITY;

-- Insertar potes iniciales
INSERT INTO pots (name, percentage, balance, color, description) VALUES
('Pote de Premios', 70.00, 0, '#10b981', 'Reservado para pagar premios a ganadores'),
('Pote de Reserva', 20.00, 0, '#3b82f6', 'Fondo de reserva para estabilidad operativa'),
('Pote de Ganancias', 10.00, 0, '#8b5cf6', 'Ganancias del negocio disponibles para retiro');
`)

console.log('\n5️⃣ ARCHIVOS A ACTUALIZAR:')

const archivos = [
  'src/hooks/use-supabase-pots.ts',
  'src/hooks/use-supabase-withdrawals.ts', 
  'src/hooks/use-supabase-auth.ts',
  'src/hooks/use-supabase-bets.ts',
  'src/hooks/use-supabase-draws.ts',
  'src/hooks/use-supabase-lotteries.ts',
  'src/hooks/use-supabase-roles.ts',
  'src/hooks/use-supabase-users.ts',
  'test-withdrawals-module.mjs',
  'test-pots-integration.mjs'
]

archivos.forEach(archivo => {
  console.log(`   - ${archivo}`)
})

console.log('\n6️⃣ PROBAR CONEXIÓN:')
console.log('   node diagnose-supabase.mjs')
console.log('   node test-withdrawals-module.mjs')

console.log('\n✨ Una vez completado, el botón de retiros funcionará perfectamente!')

console.log('\n💡 ALTERNATIVA RÁPIDA:')
console.log('Si quieres probar sin Supabase temporalmente:')
console.log('- El sistema funciona en modo local usando localStorage')
console.log('- Los datos se guardan en el navegador')
console.log('- Ideal para desarrollo y pruebas')