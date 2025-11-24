
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function applyMigration() {
  console.log('🔧 Aplicando migración de bets...')
  
  const sql = `
    alter table public.bets 
    add column if not exists user_id uuid references auth.users(id);

    create index if not exists bets_user_id_idx on public.bets(user_id);
  `

  // Intentar con exec_sql
  const { error } = await supabase.rpc('exec_sql', { sql })

  if (error) {
    console.log('❌ Error con exec_sql:', error.message)
    
    // Intentar con query
    const { error: queryError } = await supabase.rpc('query', { query: sql })
    if (queryError) {
      console.log('❌ Error con query:', queryError.message)
      console.log('⚠️ No se pudo aplicar la migración automáticamente.')
      console.log('📋 Por favor ejecuta este SQL en Supabase:')
      console.log(sql)
    } else {
      console.log('✅ Migración aplicada con query()')
    }
  } else {
    console.log('✅ Migración aplicada con exec_sql()')
  }
}

applyMigration()
