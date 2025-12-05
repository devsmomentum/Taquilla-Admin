-- Actualizar user_type del comercializador
UPDATE users 
SET user_type = 'comercializadora'
WHERE email = 'comercializador@loteria.com';

-- Verificar que se actualizó correctamente
SELECT id, name, email, user_type, is_active 
FROM users 
WHERE email = 'comercializador@loteria.com';

-- Debe retornar:
-- user_type = 'comercializadora' ✅
