#!/usr/bin/env node

console.log('🔧 SCRIPT PARA DESACTIVAR RLS EN TABLA WITHDRAWALS')
console.log('=' .repeat(50))

console.log('\\n📋 COMANDOS PARA EJECUTAR EN SUPABASE SQL EDITOR:')
console.log('')

console.log('-- 1️⃣ Verificar si la tabla withdrawals existe')
console.log(`SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'withdrawals'
);`)

console.log('\\n-- 2️⃣ Si no existe, crear la tabla withdrawals')
console.log(`CREATE TABLE IF NOT EXISTS public.withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_pot VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL CHECK (amount > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);`)

console.log('\\n-- 3️⃣ Desactivar RLS en withdrawals (si está activo)')
console.log('ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;')

console.log('\\n-- 4️⃣ Crear índices para mejor rendimiento')
console.log(`CREATE INDEX IF NOT EXISTS idx_withdrawals_from_pot ON withdrawals(from_pot);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_by ON withdrawals(created_by);`)

console.log('\\n-- 5️⃣ Verificar estado final')
console.log(`SELECT 
    tablename,
    rowsecurity as "RLS_Enabled",
    CASE 
        WHEN rowsecurity THEN '🔒 Bloqueada'
        ELSE '🔓 Abierta'
    END as "Estado"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'withdrawals';`)

console.log('\\n🎯 RESULTADO ESPERADO:')
console.log('La consulta anterior debería mostrar:')
console.log('withdrawals | f | 🔓 Abierta')

console.log('\\n💡 INSTRUCCIONES:')
console.log('1. Ve a tu dashboard de Supabase')
console.log('2. Abre el SQL Editor')  
console.log('3. Copia y pega los comandos de arriba uno por uno')
console.log('4. Ejecuta cada comando')
console.log('5. Ejecuta nuevamente: node test-withdrawals-module.mjs')

console.log('\\n✨ Una vez que funcione, el botón "Retirar" estará operativo!')