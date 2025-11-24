
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkUserIdColumn() {
  console.log('🔍 Verificando columna user_id en bets...')
  
  // Intentamos insertar una jugada dummy para ver si devuelve user_id
  // O simplemente hacemos un select de user_id (aunque esté vacía, si la columna no existe dará error)
  
  const { data, error } = await supabase
    .from('bets')
    .select('user_id')
    .limit(1)

  if (error) {
    console.log('❌ Error seleccionando user_id:', error.message)
  } else {
    console.log('✅ Columna user_id existe (o al menos el select no falló).')
  }
}

checkUserIdColumn()
