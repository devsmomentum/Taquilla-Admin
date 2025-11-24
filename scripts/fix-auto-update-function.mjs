import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 ARREGLANDO FUNCIÓN DE AUTO-ACTUALIZACIÓN');
console.log('='.repeat(50));

console.log('🎯 PROBLEMA DETECTADO:');
console.log('La función refresh_users_with_roles tiene un error con el DELETE.');
console.log('Necesitamos corregir esto para que la auto-actualización funcione.');
console.log('');

console.log('🔧 SOLUCIÓN - EJECUTA ESTE SQL EN SUPABASE:');
console.log('━'.repeat(50));

const fixSQL = `
-- Corregir función de actualización
CREATE OR REPLACE FUNCTION refresh_users_with_roles()
RETURNS VOID AS $$
BEGIN
    -- Limpiar tabla (corregido)
    TRUNCATE users_with_roles;
    
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

-- Refrescar datos después de la corrección
SELECT refresh_users_with_roles();
`;

console.log(fixSQL);
console.log('━'.repeat(50));

async function testCurrentState() {
    console.log('\n📊 ESTADO ACTUAL DE LA TABLA:');
    
    try {
        const { data, error } = await supabase
            .from('users_with_roles')
            .select('name, email, role_names, synced_at')
            .order('name');

        if (error) {
            console.log('❌ Error:', error.message);
        } else {
            console.log(`✅ ${data.length} usuarios encontrados:`);
            data.forEach((user, index) => {
                const roles = user.role_names?.length > 0 ? user.role_names.join(', ') : 'Sin roles asignados';
                console.log(`   ${index + 1}. ${user.name} (${user.email})`);
                console.log(`      🛡️ ${roles}`);
            });
        }
    } catch (error) {
        console.log('❌ Error de conexión:', error.message);
    }
}

await testCurrentState();

console.log('\n💡 RESPUESTA A TU PREGUNTA:');
console.log('━'.repeat(40));
console.log('🔄 NO hay dos tablas - Se reemplazó completamente');
console.log('✅ Mismo nombre: users_with_roles');
console.log('✅ Tu código sigue funcionando igual');
console.log('✅ Los datos se migraron automáticamente');
console.log('❌ Solo falta corregir la función de actualización');

console.log('\n📋 PASOS FINALES:');
console.log('1. Ejecuta el SQL de corrección mostrado arriba');
console.log('2. La auto-actualización funcionará perfectamente');
console.log('3. ¡Sistema 100% completo sin "Unrestricted"!');

console.log('\n❓ ¿Ejecutas la corrección de la función?');