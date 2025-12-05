-- Habilitar RLS en la tabla users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 1. Política de Lectura (SELECT)

-- A. El usuario puede ver su propio perfil
-- Corrección: id es UUID, auth.uid() es UUID. Se comparan directamente.
CREATE POLICY "Usuarios pueden ver su propio perfil" 
ON users FOR SELECT 
USING (
  auth.uid() = id
);

-- B. El usuario puede ver a sus descendientes directos (hijos)
-- Corrección: parent_id es TEXT, auth.uid() se debe castear a TEXT.
CREATE POLICY "Usuarios pueden ver sus hijos directos" 
ON users FOR SELECT 
USING (
  auth.uid()::text = parent_id
);

-- C. Administradores pueden ver TODO
-- Corrección: id es UUID, se compara directo con auth.uid()
CREATE POLICY "Admins pueden ver todo" 
ON users FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM users u_check 
    WHERE u_check.id = auth.uid() 
    AND u_check.user_type = 'admin'
  )
);

-- 2. Política de Inserción (INSERT)
CREATE POLICY "Usuarios crean hijos asignandose como padre" 
ON users FOR INSERT 
WITH CHECK (
  -- El padre debe ser el usuario actual (casteado a text)
  parent_id = auth.uid()::text
  OR 
  -- O el usuario es admin
  EXISTS (
    SELECT 1 FROM users u_check 
    WHERE u_check.id = auth.uid() 
    AND u_check.user_type = 'admin'
  )
);

-- 3. Política de Actualización (UPDATE)
CREATE POLICY "Usuarios editan hijos directos" 
ON users FOR UPDATE 
USING (
  auth.uid()::text = parent_id
  OR
  EXISTS (
    SELECT 1 FROM users u_check 
    WHERE u_check.id = auth.uid() 
    AND u_check.user_type = 'admin'
  )
);

-- 4. Política de Eliminación (DELETE)
CREATE POLICY "Usuarios borran hijos directos" 
ON users FOR DELETE 
USING (
  auth.uid()::text = parent_id
  OR
  EXISTS (
    SELECT 1 FROM users u_check 
    WHERE u_check.id = auth.uid() 
    AND u_check.user_type = 'admin'
  )
);
