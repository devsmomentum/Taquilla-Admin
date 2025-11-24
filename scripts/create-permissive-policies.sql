-- Script para crear políticas RLS permisivas para users
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- Primero eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Users are viewable by everyone" ON users;
DROP POLICY IF EXISTS "Users can be inserted by anyone" ON users;
DROP POLICY IF EXISTS "Users can be updated by anyone" ON users;
DROP POLICY IF EXISTS "Users can be deleted by anyone" ON users;

-- Crear políticas permisivas para desarrollo
CREATE POLICY "Enable read access for all users" ON users
    FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON users
    FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON users
    FOR DELETE USING (true);

-- Asegurar que RLS esté habilitado
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Verificar políticas creadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'users';