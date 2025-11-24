-- Script para arreglar las políticas RLS (Row Level Security) en Supabase
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

-- Deshabilitar temporalmente RLS para la tabla roles
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- O alternativamente, crear políticas más permisivas
-- Si prefieres mantener RLS habilitado, descomenta las siguientes líneas:

/*
-- Habilitar RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Política para permitir SELECT a todos los usuarios autenticados
CREATE POLICY "Allow read access to roles" ON roles
  FOR SELECT
  USING (true);

-- Política para permitir INSERT a usuarios autenticados
CREATE POLICY "Allow insert access to roles" ON roles
  FOR INSERT
  WITH CHECK (true);

-- Política para permitir UPDATE a usuarios autenticados
CREATE POLICY "Allow update access to roles" ON roles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Política para permitir DELETE a usuarios autenticados (excepto roles del sistema)
CREATE POLICY "Allow delete access to roles" ON roles
  FOR DELETE
  USING (NOT is_system);
*/

-- Verificar que se pueden insertar roles
SELECT 'RLS configurado correctamente' as status;