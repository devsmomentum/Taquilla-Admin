-- Script para deshabilitar RLS en tabla lotteries
-- Ejecutar en el SQL Editor de Supabase Dashboard

-- Deshabilitar RLS en lotteries
ALTER TABLE lotteries DISABLE ROW LEVEL SECURITY;

-- Opcional: También en prizes si da problemas
ALTER TABLE prizes DISABLE ROW LEVEL SECURITY;

-- Verificar estado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('lotteries', 'prizes', 'users', 'roles');

-- El resultado debería mostrar rowsecurity = false para las tablas importantes