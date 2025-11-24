import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

console.log('🔧 Verificando y arreglando acceso a la tabla roles...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAndFixRoles() {
    try {
        // Intentar acceder directamente a la tabla roles
        console.log('🧪 Probando acceso actual a la tabla roles...')
        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('*')

        if (rolesError) {
            console.error('❌ Error accediendo a roles:', rolesError.message)
            
            if (rolesError.message.includes('row-level security')) {
                console.log('🔍 El problema es Row Level Security (RLS)')
                console.log('\n📋 SOLUCIÓN:')
                console.log('1. Ve a tu Supabase Dashboard: https://app.supabase.com')
                console.log('2. Selecciona tu proyecto')
                console.log('3. Ve a SQL Editor')
                console.log('4. Ejecuta el siguiente comando:')
                console.log('\n   ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;\n')
                console.log('5. Después ejecuta este comando para verificar:')
                console.log('\n   SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = \'roles\';\n')
                console.log('📁 También puedes usar el archivo: disable-roles-rls.sql')
            }
        } else {
            console.log('✅ Acceso exitoso a la tabla roles')
            console.log(`📊 Se encontraron ${roles?.length || 0} roles`)
            
            if (roles && roles.length > 0) {
                console.log('📋 Roles encontrados:')
                roles.forEach(role => {
                    console.log(`   - ${role.name}: ${role.description}`)
                })
            }
            
            console.log('\n🎉 La tabla roles ya está funcionando correctamente')
        }

        // Intentar verificar permisos
        console.log('\n🔍 Verificando permisos de inserción...')
        const testRole = {
            name: 'test_role_' + Date.now(),
            description: 'Rol de prueba temporal',
            permissions: ['test'],
            is_system: false
        }

        const { data: insertData, error: insertError } = await supabase
            .from('roles')
            .insert([testRole])
            .select()

        if (insertError) {
            console.error('❌ Error al insertar rol de prueba:', insertError.message)
        } else {
            console.log('✅ Inserción de prueba exitosa')
            
            // Limpiar el rol de prueba
            if (insertData && insertData.length > 0) {
                await supabase
                    .from('roles')
                    .delete()
                    .eq('id', insertData[0].id)
                console.log('🧹 Rol de prueba eliminado')
            }
        }

    } catch (error) {
        console.error('❌ Error general:', error)
    }
}

checkAndFixRoles()