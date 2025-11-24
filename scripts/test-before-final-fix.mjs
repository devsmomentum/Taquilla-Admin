import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

console.log('🎯 SOLUCION DEFINITIVA: Habilitando RLS con políticas apropiadas')
console.log('   Esto debería cambiar "Unrestricted" a "Protected" en el dashboard\n')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testCurrentState() {
    try {
        console.log('1. 📊 Estado actual - probando acceso...')
        const { data: roles, error: rolesError } = await supabase
            .from('roles')
            .select('*')

        if (rolesError) {
            console.error('❌ Error actual:', rolesError.message)
        } else {
            console.log(`✅ Acceso actual exitoso - ${roles?.length || 0} roles`)
        }

        console.log('\n2. 🧪 Probando inserción...')
        const testRole = {
            name: 'test_final_' + Date.now(),
            description: 'Prueba final',
            permissions: ['test'],
            is_system: false
        }

        const { data: insertData, error: insertError } = await supabase
            .from('roles')
            .insert([testRole])
            .select()

        if (insertError) {
            console.error('❌ Error en inserción:', insertError.message)
        } else {
            console.log('✅ Inserción exitosa')
            
            // Limpiar
            if (insertData && insertData.length > 0) {
                await supabase
                    .from('roles')
                    .delete()
                    .eq('id', insertData[0].id)
                console.log('🧹 Limpieza completada')
            }
        }

        console.log('\n📋 PRÓXIMOS PASOS:')
        console.log('1. Ve a Supabase Dashboard > SQL Editor')
        console.log('2. Ejecuta el archivo: fix-unrestricted-final.sql')
        console.log('3. Esto habilitará RLS con políticas apropiadas')
        console.log('4. Refresca el dashboard - debería mostrar "Protected" en lugar de "Unrestricted"')
        
        console.log('\n🔍 DIFERENCIA CLAVE:')
        console.log('- "Unrestricted" = RLS deshabilitado o sin políticas')
        console.log('- "Protected" = RLS habilitado con políticas apropiadas')
        console.log('- Supabase prefiere ver tablas "Protected" en lugar de "Unrestricted"')

    } catch (error) {
        console.error('❌ Error:', error)
    }
}

testCurrentState()