
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function inspectBets() {
  console.log('🔍 Inspeccionando tabla bets...')
  const { data, error } = await supabase
    .from('bets')
    .select('*')
    .limit(1)

  if (error) {
    console.error('❌ Error:', error)
  } else {
    if (data.length > 0) {
      console.log('📋 Columnas encontradas:', Object.keys(data[0]))
      console.log('📄 Ejemplo:', data[0])
    } else {
      console.log('⚠️ La tabla está vacía.')
    }
  }
}

inspectBets()
