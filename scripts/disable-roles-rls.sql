-- Script para deshabilitar RLS en la tabla roles
-- Ejecutar este SQL en el Supabase Dashboard > SQL Editor

-- Deshabilitar Row Level Security para la tabla roles
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- Verificar el cambio
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'roles' AND schemaname = 'public';

-- Mensaje de confirmación
SELECT 'RLS deshabilitado exitosamente para la tabla roles' as resultado;