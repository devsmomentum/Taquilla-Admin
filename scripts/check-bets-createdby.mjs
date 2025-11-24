
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://dxfivioylmbpumzcpwtu.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkCreatedByColumn() {
  console.log('🔍 Verificando columna created_by en bets...')
  
  const { data, error } = await supabase
    .from('bets')
    .select('created_by')
    .limit(1)

  if (error) {
    console.log('❌ Error seleccionando created_by:', error.message)
  } else {
    console.log('✅ Columna created_by existe.')
  }
}

checkCreatedByColumn()
