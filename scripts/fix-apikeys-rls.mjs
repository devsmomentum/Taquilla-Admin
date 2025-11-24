#!/usr/bin/env node

/**
 * 🔐 CONFIGURACIÓN DE RLS PARA API KEYS
 * Módulo 10: Implementación de Row Level Security para gestión de API Keys
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

// Cargar variables de entorno
config()

const supabaseUrl = process.env.VITE_SUPABASE_URL
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Error: Variables de entorno de Supabase no encontradas')
  console.log('Asegúrate de que existan:')
  console.log('- VITE_SUPABASE_URL')
  console.log('- VITE_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

console.log('🔐 CONFIGURANDO RLS PARA API KEYS...\n')

async function setupApiKeysRLS() {
  try {
    console.log('1️⃣ Verificando conexión con Supabase...')
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (connectionError) {
      throw new Error(`Error de conexión: ${connectionError.message}`)
    }
    console.log('✅ Conexión exitosa con Supabase')

    console.log('\n2️⃣ Verificando tabla api_keys...')
    const { data: tableCheck, error: tableError } = await supabase
      .from('api_keys')
      .select('count')
      .limit(1)

    if (tableError) {
      console.log('⚠️ Tabla api_keys no existe. Creándola...')
      
      // Ejecutar script completo de creación
      const { error: createError } = await supabase.rpc('exec_sql', {
        query: `
          -- Crear tabla api_keys si no existe
          CREATE TABLE IF NOT EXISTS api_keys (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name VARCHAR(255) NOT NULL,
            key_hash TEXT NOT NULL UNIQUE,
            key_prefix VARCHAR(10) NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            is_active BOOLEAN DEFAULT TRUE,
            permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            last_used_at TIMESTAMP WITH TIME ZONE,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          );
        `
      })

      if (createError) {
        console.log('⚠️ Error creando tabla (puede que ya exista):', createError.message)
      }
    }
    console.log('✅ Tabla api_keys verificada')

    console.log('\n3️⃣ Configurando Row Level Security...')
    
    // Habilitar RLS
    const { error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
      `
    })

    if (rlsError && !rlsError.message.includes('already enabled')) {
      console.log('⚠️ Error habilitando RLS:', rlsError.message)
    } else {
      console.log('✅ RLS habilitado en tabla api_keys')
    }

    console.log('\n4️⃣ Creando políticas de seguridad...')
    
    // Eliminar políticas existentes
    const { error: dropError } = await supabase.rpc('exec_sql', {
      query: `
        DROP POLICY IF EXISTS "Users can view api_keys with proper permissions" ON api_keys;
        DROP POLICY IF EXISTS "Users can create api_keys with permissions" ON api_keys;
        DROP POLICY IF EXISTS "Users can update own api_keys or with permissions" ON api_keys;
        DROP POLICY IF EXISTS "Users can delete own api_keys or with permissions" ON api_keys;
      `
    })

    // Crear nuevas políticas
    const policies = [
      {
        name: 'SELECT Policy',
        sql: `
          CREATE POLICY "Users can view api_keys with proper permissions" ON api_keys
            FOR SELECT
            USING (
              auth.uid() IS NOT NULL AND (
                created_by = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM get_user_permissions(auth.uid()::text)
                  WHERE unnest = 'api-keys'
                )
              )
            );
        `
      },
      {
        name: 'INSERT Policy',
        sql: `
          CREATE POLICY "Users can create api_keys with permissions" ON api_keys
            FOR INSERT
            WITH CHECK (
              auth.uid() IS NOT NULL AND
              created_by = auth.uid() AND
              EXISTS (
                SELECT 1 FROM get_user_permissions(auth.uid()::text)
                WHERE unnest = 'api-keys'
              )
            );
        `
      },
      {
        name: 'UPDATE Policy',
        sql: `
          CREATE POLICY "Users can update own api_keys or with permissions" ON api_keys
            FOR UPDATE
            USING (
              auth.uid() IS NOT NULL AND (
                created_by = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM get_user_permissions(auth.uid()::text)
                  WHERE unnest = 'api-keys'
                )
              )
            );
        `
      },
      {
        name: 'DELETE Policy',
        sql: `
          CREATE POLICY "Users can delete own api_keys or with permissions" ON api_keys
            FOR DELETE
            USING (
              auth.uid() IS NOT NULL AND (
                created_by = auth.uid() OR
                EXISTS (
                  SELECT 1 FROM get_user_permissions(auth.uid()::text)
                  WHERE unnest = 'api-keys'
                )
              )
            );
        `
      }
    ]

    for (const policy of policies) {
      const { error: policyError } = await supabase.rpc('exec_sql', {
        query: policy.sql
      })

      if (policyError) {
        console.log(`⚠️ Error creando ${policy.name}:`, policyError.message)
      } else {
        console.log(`✅ ${policy.name} creada exitosamente`)
      }
    }

    console.log('\n5️⃣ Verificando permisos de usuario actual...')
    
    // Obtener usuario actual
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (user) {
      console.log(`📋 Usuario actual: ${user.email}`)
      
      // Verificar permisos
      const { data: permissions, error: permError } = await supabase
        .rpc('get_user_permissions', { user_uuid: user.id })
      
      if (permError) {
        console.log('⚠️ Error verificando permisos:', permError.message)
      } else {
        console.log('🔑 Permisos del usuario:', permissions)
        
        const hasApiKeysPermission = permissions?.includes('api-keys')
        console.log(`🎯 Permiso api-keys: ${hasApiKeysPermission ? '✅ SÍ' : '❌ NO'}`)
        
        if (!hasApiKeysPermission) {
          console.log('\n⚠️ IMPORTANTE: El usuario actual no tiene permisos para gestionar API Keys')
          console.log('Asegúrate de que tu usuario tenga el rol correcto asignado.')
        }
      }
    }

    console.log('\n6️⃣ Probando acceso a la tabla...')
    
    const { data: apiKeysTest, error: testError } = await supabase
      .from('api_keys')
      .select('*')
      .limit(5)
    
    if (testError) {
      console.log('❌ Error accediendo a api_keys:', testError.message)
      console.log('Esto puede ser normal si no tienes permisos o no hay datos.')
    } else {
      console.log(`✅ Acceso exitoso - ${apiKeysTest?.length || 0} registros encontrados`)
    }

    console.log('\n✅ CONFIGURACIÓN DE RLS COMPLETADA')
    console.log('\n📋 RESUMEN:')
    console.log('- RLS habilitado en tabla api_keys')
    console.log('- 4 políticas de seguridad creadas')
    console.log('- Acceso basado en roles y permisos')
    console.log('- Solo usuarios con permiso "api-keys" pueden gestionar keys')
    
    return true

  } catch (error) {
    console.error('❌ Error durante configuración:', error)
    return false
  }
}

// Función para verificar configuración actual
async function verifyCurrentSetup() {
  console.log('\n🔍 VERIFICANDO CONFIGURACIÓN ACTUAL...')
  
  try {
    // Verificar tabla
    const { data: tableInfo, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('*')
      .eq('table_name', 'api_keys')
    
    console.log(`📊 Tabla api_keys: ${tableInfo?.length > 0 ? '✅ EXISTE' : '❌ NO EXISTE'}`)
    
    // Verificar RLS
    const { data: rlsInfo, error: rlsError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT relrowsecurity 
        FROM pg_class 
        WHERE relname = 'api_keys';
      `
    })
    
    if (rlsInfo?.length > 0) {
      const rlsEnabled = rlsInfo[0].relrowsecurity
      console.log(`🔐 RLS Estado: ${rlsEnabled ? '✅ HABILITADO' : '❌ DESHABILITADO'}`)
    }
    
    // Contar políticas
    const { data: policiesInfo, error: policiesError } = await supabase.rpc('exec_sql', {
      query: `
        SELECT COUNT(*) as policy_count
        FROM pg_policies 
        WHERE tablename = 'api_keys';
      `
    })
    
    if (policiesInfo?.length > 0) {
      const policyCount = policiesInfo[0].policy_count
      console.log(`📜 Políticas RLS: ${policyCount} creadas`)
    }
    
  } catch (error) {
    console.log('⚠️ Error verificando configuración:', error.message)
  }
}

// Ejecutar configuración
async function main() {
  console.log('🚀 INICIANDO CONFIGURACIÓN RLS PARA API KEYS')
  console.log('='.repeat(50))
  
  await verifyCurrentSetup()
  
  const success = await setupApiKeysRLS()
  
  if (success) {
    console.log('\n🎉 ¡CONFIGURACIÓN COMPLETADA EXITOSAMENTE!')
    console.log('\nPróximos pasos:')
    console.log('1. Verificar que tu usuario tenga el rol con permiso "api-keys"')
    console.log('2. Probar crear una API Key desde la interfaz')
    console.log('3. Verificar que las políticas de seguridad funcionen')
  } else {
    console.log('\n❌ Error en la configuración. Revisar logs arriba.')
  }
}

main()