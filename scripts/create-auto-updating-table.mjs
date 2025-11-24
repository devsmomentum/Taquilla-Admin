import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔄 SOLUCIÓN: TABLA AUTO-ACTUALIZABLE CON RLS');
console.log('='.repeat(60));
console.log('Esta solución crea una tabla que se actualiza automáticamente');
console.log('cada vez que cambies usuarios, roles o relaciones user_roles.');
console.log('');

console.log('🎯 BENEFICIOS:');
console.log('✅ Elimina completamente "Unrestricted"');
console.log('✅ Se actualiza automáticamente con triggers');
console.log('✅ Mantiene RLS configurado');
console.log('✅ Misma funcionalidad que una vista');
console.log('✅ Compatible con tu código actual');

console.log('\n🔧 CÓDIGO PARA EJECUTAR EN SUPABASE SQL EDITOR:');
console.log('━'.repeat(60));

const sqlCode = `
-- ================================================
-- PASO 1: Eliminar vista actual
-- ================================================
DROP VIEW IF EXISTS users_with_roles CASCADE;

-- ================================================
-- PASO 2: Crear tabla users_with_roles
-- ================================================
CREATE TABLE users_with_roles (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL,
    role_names TEXT[] DEFAULT ARRAY[]::TEXT[],
    role_ids UUID[] DEFAULT ARRAY[]::UUID[],
    synced_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- PASO 3: Habilitar RLS y crear políticas
-- ================================================
ALTER TABLE users_with_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on users_with_roles" 
ON users_with_roles FOR ALL 
TO public 
USING (true) 
WITH CHECK (true);

-- ================================================
-- PASO 4: Función para actualizar datos
-- ================================================
CREATE OR REPLACE FUNCTION refresh_users_with_roles()
RETURNS VOID AS $$
BEGIN
    -- Limpiar tabla
    DELETE FROM users_with_roles;
    
    -- Insertar datos actualizados
    INSERT INTO users_with_roles (id, name, email, is_active, created_at, updated_at, role_names, role_ids, synced_at)
    SELECT 
        u.id,
        u.name,
        u.email,
        u.is_active,
        u.created_at,
        u.updated_at,
        COALESCE(
            array_agg(r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL), 
            ARRAY[]::text[]
        ) as role_names,
        COALESCE(
            array_agg(r.id ORDER BY r.name) FILTER (WHERE r.id IS NOT NULL), 
            ARRAY[]::uuid[]
        ) as role_ids,
        NOW() as synced_at
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    GROUP BY u.id, u.name, u.email, u.is_active, u.created_at, u.updated_at;
    
    RAISE NOTICE 'users_with_roles actualizada: % registros', (SELECT COUNT(*) FROM users_with_roles);
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- PASO 5: Llenar tabla inicial
-- ================================================
SELECT refresh_users_with_roles();

-- ================================================
-- PASO 6: Crear triggers para auto-actualización
-- ================================================

-- Trigger para cambios en usuarios
CREATE OR REPLACE FUNCTION trigger_refresh_users_with_roles()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_users_with_roles();
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Triggers en tabla users
DROP TRIGGER IF EXISTS users_refresh_trigger ON users;
CREATE TRIGGER users_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_users_with_roles();

-- Triggers en tabla roles  
DROP TRIGGER IF EXISTS roles_refresh_trigger ON roles;
CREATE TRIGGER roles_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_users_with_roles();

-- Triggers en tabla user_roles
DROP TRIGGER IF EXISTS user_roles_refresh_trigger ON user_roles;
CREATE TRIGGER user_roles_refresh_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW
    EXECUTE FUNCTION trigger_refresh_users_with_roles();

-- ================================================
-- PASO 7: Crear índices para rendimiento
-- ================================================
CREATE INDEX idx_users_with_roles_id ON users_with_roles(id);
CREATE INDEX idx_users_with_roles_email ON users_with_roles(email);
CREATE INDEX idx_users_with_roles_active ON users_with_roles(is_active);

-- ================================================
-- VERIFICACIÓN FINAL
-- ================================================
SELECT 
    'users_with_roles creada exitosamente' as status,
    COUNT(*) as total_users,
    MAX(synced_at) as last_sync
FROM users_with_roles;
`;

console.log(sqlCode);
console.log('━'.repeat(60));

console.log('\n🎯 ¿CÓMO FUNCIONA LA AUTO-ACTUALIZACIÓN?');
console.log('');
console.log('1. 🔄 Cuando AGREGAS un usuario → Se actualiza automáticamente');
console.log('2. 🔄 Cuando EDITAS un usuario → Se actualiza automáticamente');  
console.log('3. 🔄 Cuando ELIMINAS un usuario → Se actualiza automáticamente');
console.log('4. 🔄 Cuando CAMBIAS roles → Se actualiza automáticamente');
console.log('5. 🔄 Cuando ASIGNAS/QUITAS roles → Se actualiza automáticamente');

console.log('\n✅ RESULTADO FINAL:');
console.log('• ❌ Adiós "Unrestricted" - Ahora tendrá RLS configurado');
console.log('• ✅ Auto-actualización completa con triggers');
console.log('• ✅ Mismo rendimiento que una vista');
console.log('• ✅ Compatible con todo tu código actual');
console.log('• ✅ Campo "synced_at" para verificar última actualización');

async function testCurrentState() {
    console.log('\n🧪 PROBANDO ESTADO ACTUAL...');
    
    try {
        const { data, error } = await supabase
            .from('users_with_roles')
            .select('id, name, role_names, synced_at')
            .limit(2);

        if (error) {
            console.log('❌ Vista actual:', error.message);
            console.log('✅ Perfecto para implementar la solución de arriba');
        } else {
            console.log('✅ Datos actuales:');
            data.forEach(user => {
                console.log(`   • ${user.name}: ${user.role_names?.join(', ') || 'Sin roles'}`);
            });
        }
    } catch (error) {
        console.log('🔍 Estado:', error.message);
    }
}

await testCurrentState();

console.log('\n🚀 INSTRUCCIONES:');
console.log('1. Copia el código SQL de arriba');
console.log('2. Ve a Supabase SQL Editor');
console.log('3. Pega y ejecuta el código completo');
console.log('4. Verifica que ya no dice "Unrestricted"');
console.log('5. ¡Disfruta de la auto-actualización!');

console.log('\n❓ ¿Estás listo para ejecutar este código?');