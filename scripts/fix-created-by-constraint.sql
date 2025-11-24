-- Script para arreglar la foreign key constraint de created_by
-- Este script hace que created_by sea opcional (NULL) o elimina la constraint

-- Opción 1: Hacer que created_by acepte NULL y no requiera foreign key
ALTER TABLE users ALTER COLUMN created_by DROP NOT NULL;

-- Opción 2: Eliminar completamente la foreign key constraint (si existe)
-- Descomentar la siguiente línea si quieres eliminar la constraint completamente
-- ALTER TABLE users DROP CONSTRAINT IF EXISTS users_created_by_fkey;

-- Opción 3: Crear un usuario "system" para referencias
INSERT INTO users (id, name, email, password_hash, is_active, created_by) 
VALUES (
  'system-user-id', 
  'Sistema', 
  'system@internal.com', 
  'system_hash', 
  true, 
  NULL
) 
ON CONFLICT (id) DO NOTHING;

-- Después de esto, puedes usar 'system-user-id' como created_by
UPDATE users SET created_by = 'system-user-id' WHERE created_by IS NULL;

COMMIT;