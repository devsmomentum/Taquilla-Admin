-- Políticas RLS para Sistema de Lotería en PRODUCCIÓN
-- Este script configura seguridad apropiada para clientes externos

-- ================================
-- TABLA: users
-- ================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their own data" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;

-- Políticas para usuarios
CREATE POLICY "Users can view their own data" ON users
    FOR SELECT USING (auth.uid()::text = id OR 
                     EXISTS (SELECT 1 FROM user_roles ur 
                            JOIN roles r ON ur.role_id = r.id 
                            WHERE ur.user_id = auth.uid()::text 
                            AND r.name = 'Administrador'));

CREATE POLICY "Users can update their own data" ON users
    FOR UPDATE USING (auth.uid()::text = id OR 
                     EXISTS (SELECT 1 FROM user_roles ur 
                            JOIN roles r ON ur.role_id = r.id 
                            WHERE ur.user_id = auth.uid()::text 
                            AND r.name = 'Administrador'));

-- Solo administradores pueden crear/eliminar usuarios
CREATE POLICY "Admins can manage all users" ON users
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur 
                          JOIN roles r ON ur.role_id = r.id 
                          WHERE ur.user_id = auth.uid()::text 
                          AND r.name = 'Administrador'));

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ================================
-- TABLA: lotteries
-- ================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Everyone can view lotteries" ON lotteries;
DROP POLICY IF EXISTS "Admins can manage lotteries" ON lotteries;

-- Todos pueden ver loterías (público)
CREATE POLICY "Everyone can view lotteries" ON lotteries
    FOR SELECT USING (true);

-- Solo administradores y operadores pueden crear/modificar loterías
CREATE POLICY "Admins can manage lotteries" ON lotteries
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur 
                          JOIN roles r ON ur.role_id = r.id 
                          WHERE ur.user_id = auth.uid()::text 
                          AND r.name IN ('Administrador', 'Operador')));

ALTER TABLE lotteries ENABLE ROW LEVEL SECURITY;

-- ================================
-- TABLA: prizes
-- ================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Everyone can view prizes" ON prizes;
DROP POLICY IF EXISTS "Admins can manage prizes" ON prizes;

-- Todos pueden ver premios
CREATE POLICY "Everyone can view prizes" ON prizes
    FOR SELECT USING (true);

-- Solo administradores pueden gestionar premios
CREATE POLICY "Admins can manage prizes" ON prizes
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur 
                          JOIN roles r ON ur.role_id = r.id 
                          WHERE ur.user_id = auth.uid()::text 
                          AND r.name = 'Administrador'));

ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- ================================
-- TABLA: roles (Solo lectura para usuarios)
-- ================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Everyone can view roles" ON roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON roles;

-- Todos pueden ver roles (para UI)
CREATE POLICY "Everyone can view roles" ON roles
    FOR SELECT USING (true);

-- Solo super administradores pueden modificar roles
CREATE POLICY "Admins can manage roles" ON roles
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur 
                          JOIN roles r ON ur.role_id = r.id 
                          WHERE ur.user_id = auth.uid()::text 
                          AND r.name = 'Super Administrador'));

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- ================================
-- TABLA: user_roles
-- ================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Users can view their roles" ON user_roles;
DROP POLICY IF EXISTS "Admins can manage user roles" ON user_roles;

-- Usuarios pueden ver sus propios roles
CREATE POLICY "Users can view their roles" ON user_roles
    FOR SELECT USING (auth.uid()::text = user_id OR 
                     EXISTS (SELECT 1 FROM user_roles ur 
                            JOIN roles r ON ur.role_id = r.id 
                            WHERE ur.user_id = auth.uid()::text 
                            AND r.name = 'Administrador'));

-- Solo administradores pueden asignar/quitar roles
CREATE POLICY "Admins can manage user roles" ON user_roles
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur 
                          JOIN roles r ON ur.role_id = r.id 
                          WHERE ur.user_id = auth.uid()::text 
                          AND r.name = 'Administrador'));

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- ================================
-- VERIFICAR CONFIGURACIÓN
-- ================================

-- Mostrar todas las políticas creadas
SELECT 
    schemaname,
    tablename, 
    policyname,
    CASE 
        WHEN cmd = 'ALL' THEN 'Todas las operaciones'
        WHEN cmd = 'SELECT' THEN 'Solo lectura'
        WHEN cmd = 'INSERT' THEN 'Solo creación'
        WHEN cmd = 'UPDATE' THEN 'Solo actualización'
        WHEN cmd = 'DELETE' THEN 'Solo eliminación'
    END as permisos
FROM pg_policies 
WHERE tablename IN ('users', 'lotteries', 'prizes', 'roles', 'user_roles')
ORDER BY tablename, policyname;

-- Mostrar estado de RLS
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '🔒 RLS Habilitado'
        ELSE '🔓 RLS Deshabilitado'
    END as estado_seguridad
FROM pg_tables 
WHERE tablename IN ('users', 'lotteries', 'prizes', 'roles', 'user_roles');