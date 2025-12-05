-- Agregar columna parent_id a la tabla users para jerarquía de supervisión
-- Jerarquía: Admin → Comercializadora → Agencia → Taquilla

-- Agregar columna parent_id
ALTER TABLE users ADD COLUMN IF NOT EXISTS parent_id TEXT;

-- Crear índice para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);

-- Comentario explicativo
COMMENT ON COLUMN users.parent_id IS 'ID del usuario supervisor. Jerarquía: Admin supervisa Comercializadoras, Comercializadoras supervisan Agencias, Agencias supervisan Taquillas';

-- Ejemplo de estructura jerárquica:
-- 
-- Admin (operador)
--   └── Comercializadora 1
--         ├── Agencia A
--         │     ├── Taquilla 1
--         │     └── Taquilla 2
--         └── Agencia B
--               └── Taquilla 3
--   └── Comercializadora 2
--         └── Agencia C
--               └── Taquilla 4
