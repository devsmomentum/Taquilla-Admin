#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

console.log('🔧 MÉTODO ALTERNATIVO: DESHABILITANDO RLS TEMPORALMENTE')
console.log('='.repeat(60))

async function fixDrawsRLSAlternative() {
  try {
    console.log('1️⃣ Probando inserción antes del arreglo...')
    
    // Obtener una lotería real
    const { data: lottery } = await supabase
      .from('lotteries')
      .select('id, name')
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (!lottery) {
      console.log('❌ No hay loterías activas')
      return
    }
    
    const testDraw = {
      lottery_id: lottery.id,
      lottery_name: lottery.name,
      winning_animal_number: '00',
      winning_animal_name: 'Delfín',
      draw_time: new Date().toISOString(),
      total_payout: 0,
      winners_count: 0
    }
    
    const { error: beforeError } = await supabase
      .from('draws')
      .insert([testDraw])
      .select()
    
    if (beforeError) {
      console.log('❌ Error antes del arreglo:', beforeError.message)
      
      if (beforeError.message.includes('row-level security')) {
        console.log('🔒 Confirmado: RLS está bloqueando')
        
        console.log('\\n💡 SOLUCIONES DISPONIBLES:')
        console.log('\\n📋 OPCIÓN A: Script SQL para ejecutar en Supabase Dashboard')
        console.log('   1. Ve a tu proyecto en https://supabase.com/dashboard')
        console.log('   2. Ve a SQL Editor')
        console.log('   3. Ejecuta este script:')
        console.log('\\n' + '─'.repeat(50))
        console.log('-- Deshabilitar RLS temporalmente para draws')
        console.log('ALTER TABLE draws DISABLE ROW LEVEL SECURITY;')
        console.log('\\n-- O crear políticas permisivas:')
        console.log('DROP POLICY IF EXISTS \"Users with winners permission can insert draws\" ON draws;')
        console.log('DROP POLICY IF EXISTS \"Public draws access\" ON draws;')
        console.log('\\nCREATE POLICY \"Allow all draws operations\" ON draws FOR ALL USING (true) WITH CHECK (true);')
        console.log('\\nALTER TABLE draws ENABLE ROW LEVEL SECURITY;')
        console.log('─'.repeat(50))
        
        console.log('\\n📋 OPCIÓN B: Crear política específica para desarrollo')
        console.log('   Si quieres mantener algo de seguridad:')
        console.log('\\n' + '─'.repeat(50))
        console.log('CREATE POLICY \"Development draws access\" ON draws')
        console.log('FOR ALL TO anon, authenticated')  
        console.log('USING (true)')
        console.log('WITH CHECK (true);')
        console.log('─'.repeat(50))
        
        return false
      }
    } else {
      console.log('✅ ¡El sorteo se insertó exitosamente!')
      console.log('🎉 No hay problema de RLS')
      return true
    }
    
  } catch (err) {
    console.log('💥 Error de conexión:', err.message)
    return false
  }
}

console.log('🧪 Diagnosticando problema RLS...')
fixDrawsRLSAlternative().then(success => {
  if (success) {
    console.log('\\n🎉 ¡PROBLEMA RESUELTO!')
    console.log('✅ Los sorteos ya se guardan directamente en Supabase')
    console.log('🔄 Prueba crear un nuevo sorteo desde la interfaz')
  } else {
    console.log('\\n⚙️ SIGUIENTE PASO:')
    console.log('📝 Ejecuta uno de los scripts SQL mostrados arriba en Supabase Dashboard')
    console.log('🔄 Luego prueba crear un sorteo nuevamente')
    console.log('\\n🌐 Dashboard: https://supabase.com/dashboard/project/dxfivioylmbpumzcpwtu')
  }
})