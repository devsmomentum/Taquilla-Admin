-- =====================================================
-- SCRIPT DE INICIALIZACIÓN DE DATOS
-- =====================================================
-- Ejecuta este script DESPUÉS del schema principal
-- para crear el usuario administrador y datos iniciales
-- =====================================================

-- Insertar roles del sistema
INSERT INTO roles (name, description, permissions, is_system) VALUES
  ('Super Administrador', 'Acceso completo al sistema', 
   '["manage_users", "manage_roles", "manage_lotteries", "manage_bets", "manage_draws", "manage_transfers", "manage_withdrawals", "view_reports", "manage_api_keys", "system_administration"]'::jsonb, 
   true),
  ('Administrador', 'Gestión de operaciones principales',
   '["manage_lotteries", "manage_bets", "manage_draws", "manage_transfers", "view_reports"]'::jsonb,
   false),
  ('Operador', 'Operaciones básicas de apuestas y sorteos',
   '["manage_bets", "manage_draws", "view_reports"]'::jsonb,
   false),
  ('Cajero', 'Gestión de transferencias y retiros',
   '["manage_transfers", "manage_withdrawals", "view_reports"]'::jsonb,
   false),
  ('Consultor', 'Solo visualización de reportes',
   '["view_reports"]'::jsonb,
   false)
ON CONFLICT (name) DO NOTHING;

-- Insertar el usuario administrador principal
WITH new_user AS (
  INSERT INTO users (name, email, password_hash, is_active)
  VALUES (
    'Administrador Principal',
    'admin@loteria.com',
    crypt('Admin123!', gen_salt('bf')),
    TRUE
  )
  RETURNING id
),
super_admin_role AS (
  SELECT id FROM roles WHERE name = 'Super Administrador'
)
INSERT INTO user_roles (user_id, role_id)
SELECT nu.id, sar.id
FROM new_user nu, super_admin_role sar
ON CONFLICT (user_id, role_id) DO NOTHING;

-- Insertar loterías predeterminadas
INSERT INTO lotteries (name, description, draw_time, is_active, animal_numbers, max_bet_amount) VALUES
  ('Lotto Activo', 'Lotería principal con sorteos cada hora', '00:00:00', true, 
   '{"1":"Delfín","2":"Ballena","3":"Caimán","4":"Alacrán","5":"León","6":"Rana","7":"Perico","8":"Ratón","9":"Águila","10":"Tigre","11":"Gato","12":"Caballo","13":"Mono","14":"Paloma","15":"Zorro","16":"Oso","17":"Pavo","18":"Burro","19":"Chivo","20":"Cochino","21":"Gallo","22":"Camello","23":"Cebra","24":"Iguana","25":"Gallina","26":"Vaca","27":"Perro","28":"Zamuro","29":"Elefante","30":"Carabina","31":"Lapa","32":"Ardilla","33":"Pescado","34":"Venado","35":"Jirafa","36":"Culebra"}'::jsonb,
   500000),
  ('La Granjita', 'Lotería con sorteos frecuentes', '00:00:00', true,
   '{"1":"Delfín","2":"Ballena","3":"Caimán","4":"Alacrán","5":"León","6":"Rana","7":"Perico","8":"Ratón","9":"Águila","10":"Tigre","11":"Gato","12":"Caballo","13":"Mono","14":"Paloma","15":"Zorro","16":"Oso","17":"Pavo","18":"Burro","19":"Chivo","20":"Cochino","21":"Gallo","22":"Camello","23":"Cebra","24":"Iguana","25":"Gallina","26":"Vaca","27":"Perro","28":"Zamuro","29":"Elefante","30":"Carabina","31":"Lapa","32":"Ardilla","33":"Pescado","34":"Venado","35":"Jirafa","36":"Culebra"}'::jsonb,
   100000),
  ('Selva Plus', 'Lotería nocturna especial', '20:00:00', true,
   '{"1":"Delfín","2":"Ballena","3":"Caimán","4":"Alacrán","5":"León","6":"Rana","7":"Perico","8":"Ratón","9":"Águila","10":"Tigre","11":"Gato","12":"Caballo","13":"Mono","14":"Paloma","15":"Zorro","16":"Oso","17":"Pavo","18":"Burro","19":"Chivo","20":"Cochino","21":"Gallo","22":"Camello","23":"Cebra","24":"Iguana","25":"Gallina","26":"Vaca","27":"Perro","28":"Zamuro","29":"Elefante","30":"Carabina","31":"Lapa","32":"Ardilla","33":"Pescado","34":"Venado","35":"Jirafa","36":"Culebra"}'::jsonb,
   750000)
ON CONFLICT (name) DO NOTHING;

-- Inicializar pozos con valores predeterminados
INSERT INTO pots (name, current_amount, description) VALUES
  ('Pozo Principal', 1000000, 'Pozo principal para premios mayores'),
  ('Pozo Segundos', 500000, 'Pozo para premios de segunda categoría'),
  ('Pozo Terceros', 250000, 'Pozo para premios de tercera categoría'),
  ('Pozo Comisiones', 100000, 'Pozo para comisiones del sistema'),
  ('Pozo Reserva', 200000, 'Pozo de reserva para contingencias')
ON CONFLICT (name) DO NOTHING;

-- Verificar que todo se haya creado correctamente
SELECT 'Roles creados:' as tipo, count(*) as cantidad FROM roles
UNION ALL
SELECT 'Usuarios creados:', count(*) FROM users
UNION ALL
SELECT 'Loterías creadas:', count(*) FROM lotteries
UNION ALL
SELECT 'Pozos creados:', count(*) FROM pots;

-- Mostrar credenciales del administrador
SELECT 
  'CREDENCIALES DEL ADMINISTRADOR:' as info,
  'Email: admin@loteria.com' as email,
  'Contraseña: Admin123!' as password,
  'Este usuario tiene acceso completo al sistema' as permisos;