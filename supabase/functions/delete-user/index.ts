// Edge Function para eliminar usuario de Auth + Public
// Path: supabase/functions/delete-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { userId } = await req.json()

        if (!userId) {
            return new Response(
                JSON.stringify({ error: 'userId es requerido' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Crear cliente con Service Role Key (tiene permisos para borrar de auth)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        )

        console.log('🗑️ Eliminando usuario:', userId)

        // 1. Limpiar dependencias primero
        console.log('🧹 Limpiando dependencias...')

        await supabaseAdmin.from('user_roles').delete().eq('user_id', userId)
        await supabaseAdmin.from('bets').delete().eq('user_id', userId)
        await supabaseAdmin.from('api_keys').delete().eq('created_by', userId)

        // Limpiar referencias a usuarios en otras tablas
        await supabaseAdmin.from('taquillas').update({ activated_by: null, user_id: null }).eq('user_id', userId)
        await supabaseAdmin.from('taquillas').update({ activated_by: null }).eq('activated_by', userId)
        await supabaseAdmin.from('agencias').update({ user_id: null }).eq('user_id', userId)
        await supabaseAdmin.from('comercializadoras').update({ user_id: null }).eq('user_id', userId)
        await supabaseAdmin.from('transfers').update({ created_by: null }).eq('created_by', userId)
        await supabaseAdmin.from('withdrawals').update({ created_by: null }).eq('created_by', userId)

        // 2. Eliminar de public.users
        console.log('📊 Eliminando de public.users...')
        const { error: publicError } = await supabaseAdmin
            .from('users')
            .delete()
            .eq('id', userId)

        if (publicError) {
            console.error('Error eliminando de public.users:', publicError)
            throw publicError
        }

        // 3. Eliminar de auth.users (IMPORTANTE: Solo funciona con Service Role Key)
        console.log('🔐 Eliminando de auth.users...')
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)

        if (authError) {
            console.error('Error eliminando de auth.users:', authError)
            throw authError
        }

        console.log('✅ Usuario eliminado completamente')

        return new Response(
            JSON.stringify({
                success: true,
                message: 'Usuario eliminado de Auth y Public correctamente'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200
            }
        )

    } catch (error) {
        console.error('❌ Error:', error)
        return new Response(
            JSON.stringify({
                error: error.message || 'Error desconocido'
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
