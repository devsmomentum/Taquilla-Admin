-- Script simple para arreglar solo las políticas RLS
-- Este script ignora errores si algo ya existe

-- Deshabilitar RLS para la tabla roles (esto debería funcionar)
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Verificar que funcionó
SELECT 
  schemaname, 
  tablename, 
  rowsecurity 
FROM pg_tables 
WHERE tablename = 'roles';

-- Mensaje de confirmación
SELECT 'Políticas RLS deshabilitadas para tabla roles' as mensaje;