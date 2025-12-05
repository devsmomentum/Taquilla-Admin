-- Solución completa para evitar recursión infinita en RLS
-- Ejecutar en SQL Editor

-- 1. Primero limpiamos las políticas anteriores que pueden estar causando bloqueo
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON users;
DROP POLICY IF EXISTS "Usuarios pueden ver sus hijos directos" ON users;
DROP POLICY IF EXISTS "Admins pueden ver todo" ON users;
DROP POLICY IF EXISTS "Usuarios crean hijos asignandose como padre" ON users;
DROP POLICY IF EXISTS "Usuarios editan hijos directos" ON users;
DROP POLICY IF EXISTS "Usuarios borran hijos directos" ON users;

-- 2. Crear una función segura para verificar si soy admin
-- Esta función usa SECURITY DEFINER para saltarse las propias reglas de RLS y evitar el bucle infinito
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
RETURNS boolean
SECURITY DEFINER -- Se ejecuta con permisos de superusuario
SET search_path = public -- Seguridad: define el path
LANGUAGE plpgsql
AS $$
BEGIN
  -- Verifica si el usuario tiene rol admin
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = user_id 
    AND user_type = 'admin'
  );
END;
$$;

-- 3. Habilitar RLS explícitamente
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Definir Políticas Correctas

-- A. Lectura (SELECT)
-- Cualquiera puede ver su propio perfil
CREATE POLICY "Ver propio perfil" 
ON users FOR SELECT 
USING (auth.uid() = id);

-- Descendientes directos (Padre ve a hijos)
CREATE POLICY "Ver hijos directos" 
ON users FOR SELECT 
USING (auth.uid()::text = parent_id);

-- Admins ven todo (usando la función segura)
CREATE POLICY "Admins ven todo" 
ON users FOR SELECT 
USING (public.is_admin(auth.uid()));

-- B. Escritura (INSERT)
CREATE POLICY "Crear usuarios" 
ON users FOR INSERT 
WITH CHECK (
  -- Soy admin
  public.is_admin(auth.uid())
  OR 
  -- O estoy creando un hijo directo mío
  (auth.uid()::text = parent_id)
);

-- C. Actualización (UPDATE)
CREATE POLICY "Editar usuarios" 
ON users FOR UPDATE 
USING (
  -- Soy admin
  public.is_admin(auth.uid())
  OR 
  -- O es mi hijo directo
  (auth.uid()::text = parent_id)
  OR
  -- O soy yo mismo (opcional, permite editar tu propio perfil si se desea)
  (auth.uid() = id)
);

-- D. Eliminación (DELETE)
CREATE POLICY "Borrar usuarios" 
ON users FOR DELETE 
USING (
  -- Soy admin
  public.is_admin(auth.uid())
  OR 
  -- O es mi hijo directo
  (auth.uid()::text = parent_id)
);
