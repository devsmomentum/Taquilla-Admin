-- Script para deshabilitar temporalmente RLS en tabla users
-- Esto permite insertar usuarios desde la aplicación

-- Deshabilitar RLS en la tabla users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Opcional: También para user_roles si da problemas
ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

-- Mostrar estado actual
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'user_roles', 'roles');