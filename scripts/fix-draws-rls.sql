-- Arreglar permisos RLS para la tabla draws (sorteos)

-- 1. Eliminar políticas restrictivas existentes
DROP POLICY IF EXISTS "draws_select_policy" ON draws;
DROP POLICY IF EXISTS "draws_insert_policy" ON draws;
DROP POLICY IF EXISTS "draws_update_policy" ON draws;
DROP POLICY IF EXISTS "draws_delete_policy" ON draws;

-- 2. Crear políticas permisivas para desarrollo
CREATE POLICY "draws_select_policy" 
ON draws FOR SELECT 
USING (true);

CREATE POLICY "draws_insert_policy" 
ON draws FOR INSERT 
WITH CHECK (true);

CREATE POLICY "draws_update_policy" 
ON draws FOR UPDATE 
USING (true);

CREATE POLICY "draws_delete_policy" 
ON draws FOR DELETE 
USING (true);

-- 3. Asegurar que RLS esté habilitado
ALTER TABLE draws ENABLE ROW LEVEL SECURITY;

-- Verificar políticas
SELECT tablename, policyname, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'draws';