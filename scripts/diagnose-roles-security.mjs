import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

console.log('🔍 Diagnosticando estado actual de la tabla roles...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnoseRolesSecurity() {
    try {
        // Intentar acceso directo
        console.log('1. 📊 Probando acceso directo a la tabla...')
        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('*')

        if (rolesError) {
            console.error('❌ Error accediendo a roles:', rolesError.message)
            console.log('🔧 Esto indica que RLS sigue activo o hay otros problemas')
        } else {
            console.log(`✅ Acceso exitoso - ${roles?.length || 0} roles encontrados`)
        }

        // Probar operaciones básicas
        console.log('\n2. 🧪 Probando inserción para verificar permisos...')
        const testRole = {
            name: 'diagnostic_test_' + Date.now(),
            description: 'Prueba diagnóstica',
            permissions: ['test'],
            is_system: false
        }

        const { data: insertData, error: insertError } = await supabase
            .from('roles')
            .insert([testRole])
            .select()

        if (insertError) {
            console.error('❌ Error en inserción:', insertError.message)
            if (insertError.message.includes('row-level security')) {
                console.log('🚨 PROBLEMA DETECTADO: RLS sigue habilitado')
                console.log('📋 Esto significa que el comando ALTER TABLE no se ejecutó correctamente')
            }
        } else {
            console.log('✅ Inserción exitosa')
            
            // Limpiar rol de prueba
            if (insertData && insertData.length > 0) {
                await supabase
                    .from('roles')
                    .delete()
                    .eq('id', insertData[0].id)
                console.log('🧹 Rol de prueba eliminado')
            }
        }

        // Mostrar información adicional
        console.log('\n3. 📋 Si la tabla sigue apareciendo como "Unrestricted":')
        console.log('   - Puede ser un problema de caché del dashboard')
        console.log('   - Refresca la página del dashboard de Supabase')
        console.log('   - El estado "Unrestricted" a veces se muestra incorrectamente')
        console.log('   - Lo importante es que la aplicación funcione (que parece que sí)')

        console.log('\n4. 🔄 Comandos alternativos para probar en SQL Editor:')
        console.log('   -- Verificar estado actual:')
        console.log('   SELECT schemaname, tablename, rowsecurity FROM pg_tables WHERE tablename = \'roles\';')
        console.log('')
        console.log('   -- Si rowsecurity = true, ejecutar:')
        console.log('   ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;')
        console.log('')
        console.log('   -- Para forzar el cambio:')
        console.log('   ALTER TABLE public.roles FORCE ROW LEVEL SECURITY;')
        console.log('   ALTER TABLE public.roles NO FORCE ROW LEVEL SECURITY;')
        console.log('   ALTER TABLE public.roles DISABLE ROW LEVEL SECURITY;')

    } catch (error) {
        console.error('❌ Error general:', error)
    }
}

diagnoseRolesSecurity()