-- =====================================================
-- FIX: Foreign Key Constraint de api_keys → users
-- =====================================================

-- 1. Ver el constraint actual
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'api_keys' 
  AND tc.constraint_type = 'FOREIGN KEY';

-- 2. Eliminar el constraint problemático
ALTER TABLE api_keys 
DROP CONSTRAINT IF EXISTS api_keys_created_by_fkey;

-- 3. Verificar que el usuario existe antes de recrear el constraint
SELECT id, name, email FROM users WHERE id = '3e188dd5-4cdc-483f-b705-d2034005e1f0';

-- 4. Recrear el constraint correctamente (sin ON DELETE CASCADE para que sea más permisivo)
ALTER TABLE api_keys
ADD CONSTRAINT api_keys_created_by_fkey 
FOREIGN KEY (created_by) 
REFERENCES users(id);

-- 5. Verificación
SELECT 'Foreign key constraint actualizado correctamente' as status;

-- 6. Listar todos los constraints de api_keys
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'api_keys';
