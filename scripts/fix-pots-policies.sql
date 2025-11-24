-- =====================================================
-- FIX: Políticas RLS para tabla POTS
-- =====================================================
-- Problema: Las políticas actuales usan auth.uid() pero 
-- el sistema usa autenticación personalizada (tabla users)
-- 
-- Solución: Crear políticas permisivas que permitan todas
-- las operaciones para usuarios públicos (anon)
-- =====================================================

-- Eliminar políticas antiguas que usan auth.uid()
DROP POLICY IF EXISTS "Authenticated users can view pots" ON pots;
DROP POLICY IF EXISTS "Users with dashboard permission can update pots" ON pots;

-- Eliminar cualquier otra política que pueda existir
DROP POLICY IF EXISTS "allow_all_pots" ON pots;
DROP POLICY IF EXISTS "pots_select_policy" ON pots;
DROP POLICY IF EXISTS "pots_insert_policy" ON pots;
DROP POLICY IF EXISTS "pots_update_policy" ON pots;
DROP POLICY IF EXISTS "pots_delete_policy" ON pots;

-- Asegurar que RLS está habilitado
ALTER TABLE pots ENABLE ROW LEVEL SECURITY;

-- Crear nuevas políticas permisivas
-- Estas políticas permiten todas las operaciones sin restricciones
-- porque la autenticación se maneja en la capa de aplicación

CREATE POLICY "pots_select_all" 
  ON pots 
  FOR SELECT 
  TO public
  USING (true);

CREATE POLICY "pots_insert_all" 
  ON pots 
  FOR INSERT 
  TO public
  WITH CHECK (true);

CREATE POLICY "pots_update_all" 
  ON pots 
  FOR UPDATE 
  TO public
  USING (true)
  WITH CHECK (true);

CREATE POLICY "pots_delete_all" 
  ON pots 
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
WHERE tablename = 'pots'
ORDER BY policyname;
