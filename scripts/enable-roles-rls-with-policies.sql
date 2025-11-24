-- Script para habilitar RLS con políticas apropiadas en la tabla roles
-- Esto reemplazará la configuración actual

-- Primero, habilitar RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si las hay
DROP POLICY IF EXISTS "Allow read access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow insert access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow update access to roles" ON public.roles;
DROP POLICY IF EXISTS "Allow delete access to roles" ON public.roles;

-- Política para permitir SELECT a todos los usuarios autenticados
CREATE POLICY "Allow read access to roles" ON public.roles
    FOR SELECT
    USING (true);

-- Política para permitir INSERT a usuarios autenticados
CREATE POLICY "Allow insert access to roles" ON public.roles
    FOR INSERT
    WITH CHECK (true);

-- Política para permitir UPDATE a usuarios autenticados
CREATE POLICY "Allow update access to roles" ON public.roles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Política para permitir DELETE (excepto roles del sistema)
CREATE POLICY "Allow delete access to roles" ON public.roles
    FOR DELETE
    USING (NOT is_system OR is_system IS NULL);

-- Verificar que las políticas se crearon correctamente
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'roles';

-- Verificar el estado de RLS
SELECT 
    schemaname, 
    tablename, 
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'roles' AND schemaname = 'public';

-- Mensaje de confirmación
SELECT 'RLS habilitado con políticas apropiadas para la tabla roles' as resultado;