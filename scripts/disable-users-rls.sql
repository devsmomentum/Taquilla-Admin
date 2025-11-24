-- Script para deshabilitar RLS en tabla users
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- Deshabilitar RLS en users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Opcional: También en user_roles si da problemas
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Verificar estado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'user_roles', 'roles');