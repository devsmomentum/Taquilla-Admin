-- Script para migrar usuarios de public.users a auth.users preservando el ID
-- Ejecuta esto en el Editor SQL de Supabase

-- 1. Habilitar la extensión pgcrypto si no está habilitada
create extension if not exists pgcrypto;

-- 2. Insertar usuarios en auth.users
-- Usaremos una contraseña por defecto '123456' para todos los usuarios migrados.
-- El hash bcrypt de '123456' es: $2a$10$6.5.4.3.2.1.0.9.8.7.6.5.4.3.2.1.0.9.8.7.6.5.4.3.2.1
-- (Nota: Genera un hash válido real si vas a usar esto en producción)
-- Hash real para '123456': $2a$10$a/.. (mejor usamos pgcrypto crypt)

DO $$
DECLARE
    r RECORD;
    default_pass_hash text;
BEGIN
    -- Generar hash para '123456'
    default_pass_hash := crypt('123456', gen_salt('bf'));

    FOR r IN SELECT * FROM public.users
    LOOP
        -- Verificar si el usuario ya existe en auth.users
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = r.id) THEN
            
            -- Insertar en auth.users
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                recovery_sent_at,
                last_sign_in_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                email_change,
                email_change_token_new,
                recovery_token
            ) VALUES (
                '00000000-0000-0000-0000-000000000000', -- instance_id por defecto
                r.id, -- MANTENER EL MISMO ID
                'authenticated',
                'authenticated',
                r.email,
                default_pass_hash,
                now(), -- email_confirmed_at (confirmado automáticamente)
                null,
                now(),
                '{"provider": "email", "providers": ["email"]}',
                jsonb_build_object('name', r.name),
                r.created_at,
                r.updated_at,
                '',
                '',
                '',
                ''
            );

            -- Insertar en auth.identities (necesario para que funcione el login)
            INSERT INTO auth.identities (
                id,
                user_id,
                identity_data,
                provider,
                provider_id,
                last_sign_in_at,
                created_at,
                updated_at
            ) VALUES (
                r.id, -- Usamos el mismo ID para la identidad
                r.id,
                jsonb_build_object('sub', r.id, 'email', r.email),
                'email',
                r.id::text, -- provider_id es requerido
                now(),
                now(),
                now()
            );
            
            RAISE NOTICE 'Usuario migrado: % (ID: %)', r.email, r.id;
        ELSE
            RAISE NOTICE 'Usuario ya existe en Auth: %', r.email;
        END IF;
    END LOOP;
END $$;
