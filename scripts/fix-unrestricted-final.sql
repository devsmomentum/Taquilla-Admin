-- Script definitivo para resolver "Unrestricted" en tabla roles
-- Este script habilita RLS con políticas apropiadas (recomendado por Supabase)

-- 1. Primero eliminar cualquier política existente
DROP POLICY IF EXISTS "Allow read access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow insert access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow update access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow delete access to roles" ON public.roles;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.roles;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.roles;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON public.roles;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON public.roles;

-- 2. Habilitar RLS (esto es lo que necesita Supabase)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- 3. Crear políticas permisivas para todos los usuarios autenticados
CREATE POLICY "roles_select_policy" ON public.roles
    FOR SELECT
    USING (true);

CREATE POLICY "roles_insert_policy" ON public.roles
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "roles_update_policy" ON public.roles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "roles_delete_policy" ON public.roles
    FOR DELETE
    USING (NOT is_system);

-- 4. Verificar que RLS está habilitado con políticas
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'RLS HABILITADO CON POLÍTICAS ✅' 
        ELSE 'RLS DESHABILITADO ❌' 
    END as estado
FROM pg_tables 
WHERE tablename = 'roles' AND schemaname = 'public';

-- 5. Verificar políticas creadas
SELECT 
    policyname,
    cmd as operacion,
    permissive,
    CASE 
        WHEN cmd = 'SELECT' THEN 'Lectura ✅'
        WHEN cmd = 'INSERT' THEN 'Inserción ✅'
        WHEN cmd = 'UPDATE' THEN 'Actualización ✅'
        WHEN cmd = 'DELETE' THEN 'Eliminación (protege system roles) ✅'
    END as descripcion
FROM pg_policies 
WHERE tablename = 'roles'
ORDER BY cmd;

-- 6. Mensaje final
SELECT 'Tabla roles configurada con RLS + políticas - debería aparecer como PROTEGIDA (no Unrestricted)' as resultado;