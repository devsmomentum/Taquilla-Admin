-- Script agresivo para forzar la deshabilitación de RLS en roles
-- Ejecutar este script completo en Supabase SQL Editor

-- 1. Forzar RLS activo primero
ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;

-- 2. Remover el forzado
ALTER TABLE public.roles NO FORCE ROW LEVEL SECURITY;

-- 3. Deshabilitar RLS completamente
ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;

-- 4. Eliminar cualquier política existente
DROP POLICY IF EXISTS "Allow read access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow insert access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow update access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow delete access to roles" ON public.roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.roles;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.roles;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.roles;

-- 5. Verificar estado final
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO ❌' 
        ELSE 'RLS DESHABILITADO ✅' 
    END as estado
FROM pg_tables 
WHERE tablename = 'roles' AND schemaname = 'public';

-- 6. Verificar que no hay políticas
SELECT 
    COALESCE(COUNT(*), 0) as politicas_activas,
    CASE 
        WHEN COUNT(*) > 0 THEN 'HAY POLÍTICAS ACTIVAS ❌'
        ELSE 'NO HAY POLÍTICAS ✅'
    END as estado_politicas
FROM pg_policies 
WHERE tablename = 'roles';

-- 7. Mensaje final
SELECT 'Tabla roles configurada sin RLS - debería aparecer como normal en el dashboard' as resultado;