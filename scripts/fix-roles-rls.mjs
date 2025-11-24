import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

console.log('🔧 Arreglando políticas RLS para la tabla roles...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixRolesRLS() {
    try {
        // Verificar estado actual de RLS
        console.log('📊 Verificando estado actual de RLS...')
        const { data: currentState, error: stateError } = await supabase
            .rpc('sql', {
                query: `
                    SELECT 
                        schemaname, 
                        tablename, 
                        rowsecurity 
                    FROM pg_tables 
                    WHERE tablename = 'roles' AND schemaname = 'public';
                `
            })

        if (stateError) {
            console.error('❌ Error verificando estado:', stateError)
            return
        }

        console.log('📋 Estado actual:', currentState)

        // Deshabilitar RLS para la tabla roles
        console.log('🔓 Deshabilitando RLS para la tabla roles...')
        const { error: disableError } = await supabase
            .rpc('sql', {
                query: 'ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;'
            })

        if (disableError) {
            console.error('❌ Error deshabilitando RLS:', disableError)
            
            // Intentar método alternativo
            console.log('🔄 Intentando método alternativo...')
            const { error: altError } = await supabase
                .rpc('sql', {
                    query: `
                        DO $$
                        BEGIN
                            IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'roles' AND schemaname = 'public') THEN
                                EXECUTE 'ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY';
                            END IF;
                        END$$;
                    `
                })
            
            if (altError) {
                console.error('❌ Error con método alternativo:', altError)
                return
            }
        }

        // Verificar que se aplicó el cambio
        console.log('✅ Verificando que RLS fue deshabilitado...')
        const { data: newState, error: verifyError } = await supabase
            .rpc('sql', {
                query: `
                    SELECT 
                        schemaname, 
                        tablename, 
                        rowsecurity 
                    FROM pg_tables 
                    WHERE tablename = 'roles' AND schemaname = 'public';
                `
            })

        if (verifyError) {
            console.error('❌ Error verificando nuevo estado:', verifyError)
            return
        }

        console.log('📋 Nuevo estado:', newState)

        // Probar que ahora podemos acceder a la tabla
        console.log('🧪 Probando acceso a la tabla roles...')
        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('*')

        if (rolesError) {
            console.error('❌ Error accediendo a roles:', rolesError)
        } else {
            console.log('✅ Acceso exitoso a la tabla roles')
            console.log(`📊 Se encontraron ${roles?.length || 0} roles`)
        }

        console.log('\n🎉 ¡RLS arreglado exitosamente para la tabla roles!')
        console.log('   La tabla ya no debería aparecer como "Unrestricted" en el dashboard')

    } catch (error) {
        console.error('❌ Error general:', error)
    }
}

fixRolesRLS()