-- SCRIPT SIMPLE PARA ARREGLAR RLS DE SORTEOS
-- Ejecuta esto en Supabase Dashboard > SQL Editor

-- Opción 1: Deshabilitar RLS completamente (más simple)
ALTER TABLE draws DISABLE ROW LEVEL SECURITY;

-- Opción 2: Mantener RLS pero con políticas permisivas (más seguro)
-- ALTER TABLE draws ENABLE ROW LEVEL SECURITY;
-- DROP POLICY IF EXISTS "Users with winners permission can insert draws" ON draws;
-- DROP POLICY IF EXISTS "Public draws access" ON draws;
-- CREATE POLICY "Allow all operations on draws" ON draws FOR ALL USING (true) WITH CHECK (true);