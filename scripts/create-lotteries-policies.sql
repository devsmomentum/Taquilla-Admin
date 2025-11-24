-- Script para crear políticas RLS permisivas para lotteries
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Enable read access for all users" ON lotteries;
DROP POLICY IF EXISTS "Enable insert access for all users" ON lotteries;
DROP POLICY IF EXISTS "Enable update access for all users" ON lotteries;
DROP POLICY IF EXISTS "Enable delete access for all users" ON lotteries;

-- Crear políticas permisivas para lotteries
CREATE POLICY "Enable read access for all users" ON lotteries
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON lotteries
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON lotteries
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON lotteries
    FOR DELETE USING (true);

-- Asegurar que RLS esté habilitado
ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;

-- Hacer lo mismo para prizes
DROP POLICY IF EXISTS "Enable read access for all users" ON prizes;
DROP POLICY IF EXISTS "Enable insert access for all users" ON prizes;
DROP POLICY IF EXISTS "Enable update access for all users" ON prizes;
DROP POLICY IF EXISTS "Enable delete access for all users" ON prizes;

CREATE POLICY "Enable read access for all users" ON prizes
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON prizes
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON prizes
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON prizes
    FOR DELETE USING (true);

ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, cmd
FROM pg_policies 
WHERE tablename IN ('lotteries', 'prizes');