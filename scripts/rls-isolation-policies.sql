-- ============================================
-- POLÍTICAS DE RLS PARA AISLAMIENTO JERÁRQUICO
-- ============================================
-- Objetivo: Cada comercializadora solo ve sus agencias
--           Cada agencia solo ve sus taquillas
--           Los admins ven todo
-- ============================================

-- ============================================
-- PASO 1: FUNCIONES HELPER (SECURITY DEFINER)
-- Estas funciones se ejecutan con permisos elevados
-- para evitar recursión infinita en RLS
-- ============================================

-- 1.1 Verificar si el usuario actual es admin
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users 
    WHERE id = auth.uid() 
    AND user_type = 'admin'
  );
END;
$$;

-- 1.2 Obtener el tipo de usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_type()
RETURNS text
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_user_type text;
BEGIN
  SELECT user_type INTO v_user_type
  FROM users 
  WHERE id = auth.uid();
  
  RETURN v_user_type;
END;
$$;

-- 1.3 Obtener comercializadora_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_comercializadora_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_comercializadora_id uuid;
BEGIN
  SELECT comercializadora_id INTO v_comercializadora_id
  FROM users 
  WHERE id = auth.uid();
  
  RETURN v_comercializadora_id;
END;
$$;

-- 1.4 Obtener agencia_id del usuario actual
CREATE OR REPLACE FUNCTION public.get_current_user_agencia_id()
RETURNS uuid
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_agencia_id uuid;
BEGIN
  SELECT agencia_id INTO v_agencia_id
  FROM users 
  WHERE id = auth.uid();
  
  RETURN v_agencia_id;
END;
$$;

-- 1.5 Verificar si un usuario es descendiente del usuario actual
-- (para admins y comercializadoras que necesitan ver toda su línea)
CREATE OR REPLACE FUNCTION public.is_user_in_my_hierarchy(target_user_id uuid)
RETURNS boolean
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_my_type text;
  v_my_comercializadora_id uuid;
  v_my_agencia_id uuid;
  v_target_user RECORD;
BEGIN
  -- Obtener mi información
  SELECT user_type, comercializadora_id, agencia_id 
  INTO v_my_type, v_my_comercializadora_id, v_my_agencia_id
  FROM users 
  WHERE id = auth.uid();
  
  -- Si soy admin, veo todo
  IF v_my_type = 'admin' THEN
    RETURN TRUE;
  END IF;
  
  -- Obtener información del usuario objetivo
  SELECT id, user_type, comercializadora_id, agencia_id, parent_id
  INTO v_target_user
  FROM users
  WHERE id = target_user_id;
  
  -- Si no existe el usuario
  IF v_target_user.id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Si soy comercializadora: veo agencias y taquillas de MI comercializadora
  IF v_my_type = 'comercializadora' THEN
    -- Veo mi propia fila
    IF target_user_id = auth.uid() THEN
      RETURN TRUE;
    END IF;
    -- Veo agencias que tienen MI comercializadora_id
    IF v_target_user.user_type = 'agencia' AND v_target_user.comercializadora_id = v_my_comercializadora_id THEN
      RETURN TRUE;
    END IF;
    -- Veo taquillas que tienen MI comercializadora_id
    IF v_target_user.user_type = 'taquilla' AND v_target_user.comercializadora_id = v_my_comercializadora_id THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Si soy agencia: veo taquillas de MI agencia
  IF v_my_type = 'agencia' THEN
    -- Veo mi propia fila
    IF target_user_id = auth.uid() THEN
      RETURN TRUE;
    END IF;
    -- Veo taquillas que tienen MI agencia_id
    IF v_target_user.user_type = 'taquilla' AND v_target_user.agencia_id = v_my_agencia_id THEN
      RETURN TRUE;
    END IF;
    RETURN FALSE;
  END IF;
  
  -- Si soy taquilla: solo me veo a mí mismo
  IF v_my_type = 'taquilla' THEN
    RETURN target_user_id = auth.uid();
  END IF;
  
  RETURN FALSE;
END;
$$;

-- ============================================
-- PASO 2: LIMPIAR POLÍTICAS ANTERIORES
-- ============================================

-- Limpiar políticas de users
DROP POLICY IF EXISTS "Ver propio perfil" ON users;
DROP POLICY IF EXISTS "Ver hijos directos" ON users;
DROP POLICY IF EXISTS "Admins ven todo" ON users;
DROP POLICY IF EXISTS "Crear usuarios" ON users;
DROP POLICY IF EXISTS "Editar usuarios" ON users;
DROP POLICY IF EXISTS "Borrar usuarios" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "Usuarios pueden ver su propio perfil" ON users;
DROP POLICY IF EXISTS "Usuarios pueden ver sus hijos directos" ON users;
DROP POLICY IF EXISTS "Admins pueden ver todo" ON users;

-- ============================================
-- PASO 3: HABILITAR RLS EN TABLAS
-- ============================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PASO 4: POLÍTICAS PARA TABLA USERS
-- Control de acceso jerárquico completo
-- ============================================

-- 4.1 SELECT: Usuarios ven solo lo que les corresponde según jerarquía
CREATE POLICY "users_hierarchical_select" ON users
FOR SELECT TO authenticated
USING (
  public.is_user_in_my_hierarchy(id)
);

-- 4.2 INSERT: Usuarios pueden crear hijos si tienen la jerarquía correcta
CREATE POLICY "users_hierarchical_insert" ON users
FOR INSERT TO authenticated
WITH CHECK (
  -- CASO 1: Admins pueden crear cualquier usuario
  public.is_current_user_admin()
  OR
  -- CASO 2: El nuevo usuario me tiene como parent_id (soy su padre directo)
  parent_id = auth.uid()::text
  OR
  -- CASO 3: Comercializadora creando agencia con su comercializadora_id
  (
    public.get_current_user_type() = 'comercializadora'
    AND user_type = 'agencia'
    AND comercializadora_id = public.get_current_user_comercializadora_id()
  )
  OR
  -- CASO 4: Agencia creando taquilla con su agencia_id
  (
    public.get_current_user_type() = 'agencia'
    AND user_type = 'taquilla'
    AND agencia_id = public.get_current_user_agencia_id()
  )
);

-- 4.3 UPDATE: Usuarios pueden actualizar sus hijos o a sí mismos
CREATE POLICY "users_hierarchical_update" ON users
FOR UPDATE TO authenticated
USING (
  -- Puede actualizar si el usuario está en mi jerarquía
  public.is_user_in_my_hierarchy(id)
)
WITH CHECK (
  -- Las actualizaciones deben mantener la jerarquía correcta
  public.is_user_in_my_hierarchy(id)
);

-- 4.4 DELETE: Usuarios pueden borrar sus hijos directos
CREATE POLICY "users_hierarchical_delete" ON users
FOR DELETE TO authenticated
USING (
  -- Admins pueden borrar todo
  public.is_current_user_admin()
  OR
  -- Puedo borrar a mis hijos directos
  parent_id = auth.uid()::text
);

-- ============================================
-- PASO 5: TEST DE VERIFICACIÓN
-- ============================================

-- Función para verificar la configuración
CREATE OR REPLACE FUNCTION public.test_rls_hierarchy()
RETURNS TABLE(
  test_name text,
  result text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 'RLS habilitado en users'::text, 
         CASE WHEN relrowsecurity 
           THEN 'OK' 
           ELSE 'FALTA HABILITAR' 
         END::text
  FROM pg_class 
  WHERE relname = 'users';
  
  RETURN QUERY
  SELECT 'Políticas SELECT en users'::text,
         (SELECT COUNT(*)::text || ' políticas' 
          FROM pg_policies 
          WHERE tablename = 'users' AND cmd = 'SELECT');
          
  RETURN QUERY
  SELECT 'Políticas INSERT en users'::text,
         (SELECT COUNT(*)::text || ' políticas' 
          FROM pg_policies 
          WHERE tablename = 'users' AND cmd = 'INSERT');
          
  RETURN QUERY
  SELECT 'Políticas UPDATE en users'::text,
         (SELECT COUNT(*)::text || ' políticas' 
          FROM pg_policies 
          WHERE tablename = 'users' AND cmd = 'UPDATE');
          
  RETURN QUERY
  SELECT 'Políticas DELETE en users'::text,
         (SELECT COUNT(*)::text || ' políticas' 
          FROM pg_policies 
          WHERE tablename = 'users' AND cmd = 'DELETE');
END;
$$;

-- ============================================
-- PASO 6: ÍNDICES PARA PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_comercializadora_id ON users(comercializadora_id);
CREATE INDEX IF NOT EXISTS idx_users_agencia_id ON users(agencia_id);
CREATE INDEX IF NOT EXISTS idx_users_user_type ON users(user_type);
CREATE INDEX IF NOT EXISTS idx_users_parent_id ON users(parent_id);

-- ============================================
-- COMENTARIOS EXPLICATIVOS
-- ============================================

COMMENT ON FUNCTION public.is_current_user_admin() IS 'Verifica si el usuario logueado es admin';
COMMENT ON FUNCTION public.get_current_user_type() IS 'Obtiene el user_type del usuario logueado';
COMMENT ON FUNCTION public.get_current_user_comercializadora_id() IS 'Obtiene comercializadora_id del usuario logueado';
COMMENT ON FUNCTION public.get_current_user_agencia_id() IS 'Obtiene agencia_id del usuario logueado';
COMMENT ON FUNCTION public.is_user_in_my_hierarchy(uuid) IS 'Verifica si un usuario pertenece a mi jerarquía de negocio';

-- ============================================
-- INSTRUCCIONES DE VERIFICACIÓN
-- ============================================
/*
Para verificar que las políticas están funcionando, ejecuta:

SELECT * FROM public.test_rls_hierarchy();

Para ver las políticas activas:

SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users';

EJEMPLO DE FLUJO:
-----------------
1. Admin crea Comercializadora1 (user_type='comercializadora')
   → Admin ve todo

2. Comercializadora1 crea AgenciaA (user_type='agencia', comercializadora_id=Comercializadora1.comercializadora_id)
   → Comercializadora1 ve AgenciaA
   → Comercializadora2 NO ve AgenciaA (diferente comercializadora_id)

3. AgenciaA crea TaquillaX (user_type='taquilla', agencia_id=AgenciaA.agencia_id)
   → AgenciaA ve TaquillaX
   → AgenciaB NO ve TaquillaX (diferente agencia_id)
   → Comercializadora1 VE TaquillaX (mismo comercializadora_id)
*/
