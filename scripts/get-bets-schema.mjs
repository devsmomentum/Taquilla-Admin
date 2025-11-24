
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getTableInfo() {
  console.log('🔍 Obteniendo esquema de bets...')
  
  // Usamos RPC 'query' si existe, o intentamos adivinar.
  // Como no tenemos acceso directo a information_schema via API client standard (a veces bloqueado),
  // intentaremos usar el RPC 'query' que vimos antes en otros archivos, si funciona.
  
  const { data, error } = await supabase.rpc('query', {
    query: "SELECT column_name FROM information_schema.columns WHERE table_name = 'bets'"
  })

  if (error) {
    console.log('❌ Error RPC:', error.message)
    // Fallback: intentar adivinar otras columnas comunes
    const candidates = ['user', 'owner', 'taquilla', 'seller_id', 'seller']
    for (const c of candidates) {
       const { error: e } = await supabase.from('bets').select(c).limit(1)
       if (!e) console.log(`✅ Columna encontrada: ${c}`)
    }
  } else {
    console.log('📋 Columnas:', data)
  }
}

getTableInfo()
