-- 🔧 SOLUCIÓN: DESACTIVAR RLS PARA POTES, TRANSFERS Y WITHDRAWALS
-- Este script permite el guardado completo en Supabase

-- =====================================================
-- DESACTIVAR RLS TEMPORALMENTE
-- =====================================================

-- Desactivar RLS en tabla pots (para asegurar acceso completo)
ALTER TABLE public.pots DISABLE ROW LEVEL SECURITY;

-- Desactivar RLS en tabla transfers (problema principal)
ALTER TABLE public.transfers DISABLE ROW LEVEL SECURITY;

-- Desactivar RLS en tabla withdrawals (problema principal)
ALTER TABLE public.withdrawals DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREAR POLÍTICAS PERMISIVAS (ALTERNATIVA)
-- =====================================================

-- Si prefieres mantener RLS activo, usa estas políticas permisivas:

-- Política permisiva para pots
CREATE POLICY "allow_all_pots" ON public.pots 
FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- Política permisiva para transfers  
CREATE POLICY "allow_all_transfers" ON public.transfers
FOR ALL
TO public
USING (true)
WITH CHECK (true);

-- Política permisiva para withdrawals
CREATE POLICY "allow_all_withdrawals" ON public.withdrawals
FOR ALL  
TO public
USING (true)
WITH CHECK (true);

-- =====================================================
-- VERIFICAR ESTADO ACTUAL
-- =====================================================

-- Verificar qué tablas tienen RLS activo
SELECT 
    schemaname,
    tablename,
    rowsecurity as "RLS Enabled",
    CASE 
        WHEN rowsecurity THEN '🔒 Protegida'
        ELSE '🔓 Abierta'
    END as "Estado"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('pots', 'transfers', 'withdrawals')
ORDER BY tablename;

-- Verificar políticas existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('pots', 'transfers', 'withdrawals')
ORDER BY tablename, policyname;