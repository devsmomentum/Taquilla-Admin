// Edge Function para crear usuario en Auth + Public (sin rate limit)
// Path: supabase/functions/create-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
    // Handle CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const {
            name,
            email,
            password,
            roleIds,
            userType,
            isActive,
            address,
            shareOnSales,
            shareOnProfits,
            parentId  // ID del padre jerárquico (comercializadora para agencia, agencia para taquilla)
        } = await req.json()

        // Validaciones
        if (!email || !password || !name) {
            return new Response(
                JSON.stringify({ error: 'Email, password y name son requeridos' }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Crear cliente con Service Role Key
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

        console.log('📝 Creando usuario:', email)

        // 1. Verificar si el email ya existe
        const { data: existingUsers, error: checkError } = await supabaseAdmin
            .from('users')
            .select('id, email')
            .eq('email', email)

        if (checkError) {
            console.error('Error verificando email:', checkError)
            throw checkError
        }

        if (existingUsers && existingUsers.length > 0) {
            console.log('❌ Email ya existe:', email)
            return new Response(
                JSON.stringify({ error: `El email ${email} ya está registrado` }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // 2. Crear usuario en auth.users con Auto-Confirm
        console.log('🔐 Creando en auth.users...')
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true, // ✅ Auto-confirmar email (sin enviar email)
            user_metadata: {
                name: name
            }
        })

        if (authError) {
            console.error('Error creando en auth:', authError)
            throw authError
        }

        if (!authData.user) {
            throw new Error('No se pudo crear el usuario en auth')
        }

        const userId = authData.user.id
        console.log('✅ Usuario creado en auth:', userId)

        // 3. Crear registro en public.users
        console.log('📊 Creando en public.users...')
        console.log('📊 shareOnSales:', shareOnSales, 'shareOnProfits:', shareOnProfits, 'parentId:', parentId)
        const { error: publicError } = await supabaseAdmin
            .from('users')
            .insert({
                id: userId,
                name: name,
                email: email,
                password_hash: 'managed_by_supabase_auth',
                is_active: isActive ?? true,
                created_by: parentId || null,
                parent_id: parentId || null,
                user_type: userType || 'admin',
                address: address || null,
                share_on_sales: parseFloat(shareOnSales) || 0,
                share_on_profits: parseFloat(shareOnProfits) || 0
            })

        if (publicError) {
            console.error('Error creando en public.users:', publicError)
            // Si falla public, eliminar de auth
            await supabaseAdmin.auth.admin.deleteUser(userId)
            throw publicError
        }

        console.log('✅ Usuario creado en public.users')

        // 4. Asignar roles
        if (roleIds && roleIds.length > 0) {
            console.log('🔑 Asignando roles:', roleIds)
            const userRoles = roleIds.map((roleId: string) => ({
                user_id: userId,
                role_id: roleId
            }))

            const { error: rolesError } = await supabaseAdmin
                .from('user_roles')
                .insert(userRoles)

            if (rolesError) {
                console.error('Error asignando roles:', rolesError)
                // No lanzar error, el usuario ya está creado
            } else {
                console.log('✅ Roles asignados')
            }
        }

        console.log('🎉 Usuario creado completamente')

        return new Response(
            JSON.stringify({
                success: true,
                userId: userId,
                message: 'Usuario creado exitosamente en Auth y Public'
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
                error: error.message || 'Error desconocido',
                details: error
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 500
            }
        )
    }
})
