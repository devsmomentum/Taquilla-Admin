-- =====================================================
-- FIX: Políticas RLS para tabla BETS
-- =====================================================
-- Problema: Las políticas actuales usan auth.uid() pero 
-- el sistema usa autenticación personalizada (tabla users)
-- 
-- Solución: Crear políticas permisivas que permitan todas
-- las operaciones para usuarios públicos (anon)
-- =====================================================

-- Eliminar políticas antiguas que usan auth.uid()
DROP POLICY IF EXISTS "Authenticated users can view bets" ON bets;
DROP POLICY IF EXISTS "Users with bets permission can insert bets" ON bets;
DROP POLICY IF EXISTS "Users with winners permission can update bets" ON bets;

-- Eliminar cualquier otra política que pueda existir
DROP POLICY IF EXISTS "bets_select_policy" ON bets;
DROP POLICY IF EXISTS "bets_insert_policy" ON bets;
DROP POLICY IF EXISTS "bets_update_policy" ON bets;
DROP POLICY IF EXISTS "bets_delete_policy" ON bets;
DROP POLICY IF EXISTS "bets_policy" ON bets;
DROP POLICY IF EXISTS "Allow all operations on bets" ON bets;

-- Asegurar que RLS está habilitado
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;

-- Crear nuevas políticas permisivas
-- Estas políticas permiten todas las operaciones sin restricciones
-- porque la autenticación se maneja en la capa de aplicación

CREATE POLICY "bets_select_all" 
  ON bets 
  FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "bets_insert_all" 
  ON bets 
  FOR INSERT 
  TO public
  WITH CHECK (true);

CREATE POLICY "bets_update_all" 
  ON bets 
  FOR UPDATE 
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "bets_delete_all" 
  ON bets 
  FOR DELETE 
  TO public
  USING (true);

-- Verificar las políticas creadas
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
WHERE tablename = 'bets'
ORDER BY policyname;
