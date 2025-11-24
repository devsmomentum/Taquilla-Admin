import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

console.log('🔧 Probando políticas RLS para la tabla roles...')

const supabase = createClient(supabaseUrl, supabaseKey)

async function testRLSPolicies() {
    try {
        console.log('📖 1. Probando SELECT (lectura)...')
        const { data: roles, error: selectError } = await supabase
            .from('roles')
            .select('*')

        if (selectError) {
            console.error('❌ Error en SELECT:', selectError.message)
        } else {
            console.log(`✅ SELECT exitoso - ${roles?.length || 0} roles encontrados`)
        }

        console.log('\n📝 2. Probando INSERT (insertar)...')
        const testRole = {
            name: 'test_rls_' + Date.now(),
            description: 'Prueba de políticas RLS',
            permissions: ['test'],
            is_system: false
        }

        const { data: insertData, error: insertError } = await supabase
            .from('roles')
            .insert([testRole])
            .select()

        if (insertError) {
            console.error('❌ Error en INSERT:', insertError.message)
        } else {
            console.log('✅ INSERT exitoso')
            
            if (insertData && insertData.length > 0) {
                const insertedRole = insertData[0]
                
                console.log('\n✏️ 3. Probando UPDATE (actualizar)...')
                const { error: updateError } = await supabase
                    .from('roles')
                    .update({ description: 'Descripción actualizada' })
                    .eq('id', insertedRole.id)

                if (updateError) {
                    console.error('❌ Error en UPDATE:', updateError.message)
                } else {
                    console.log('✅ UPDATE exitoso')
                }

                console.log('\n🗑️ 4. Probando DELETE (eliminar)...')
                const { error: deleteError } = await supabase
                    .from('roles')
                    .delete()
                    .eq('id', insertedRole.id)

                if (deleteError) {
                    console.error('❌ Error en DELETE:', deleteError.message)
                } else {
                    console.log('✅ DELETE exitoso')
                }
            }
        }

        console.log('\n🛡️ 5. Probando protección de roles del sistema...')
        const { data: systemRoles } = await supabase
            .from('roles')
            .select('*')
            .eq('is_system', true)

        if (systemRoles && systemRoles.length > 0) {
            const systemRole = systemRoles[0]
            const { error: deleteSystemError } = await supabase
                .from('roles')
                .delete()
                .eq('id', systemRole.id)

            if (deleteSystemError) {
                console.log('✅ Protección funcionando - No se puede eliminar rol del sistema')
                console.log('   Mensaje:', deleteSystemError.message)
            } else {
                console.log('⚠️ ADVERTENCIA: Se pudo eliminar un rol del sistema')
            }
        }

        console.log('\n🎉 Pruebas de políticas RLS completadas')
        console.log('   La tabla roles debería aparecer como "Protected" en lugar de "Unrestricted"')

    } catch (error) {
        console.error('❌ Error general:', error)
    }
}

testRLSPolicies()