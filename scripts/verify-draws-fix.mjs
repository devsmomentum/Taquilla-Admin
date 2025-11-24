#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'

config()

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

console.log('🔬 VERIFICACIÓN POST-ARREGLO RLS')
console.log('='.repeat(40))

async function verifyDrawsRLSFix() {
  try {
    // Obtener lotería activa
    const { data: lottery } = await supabase
      .from('lotteries')
      .select('id, name')
      .eq('is_active', true)
      .limit(1)
      .single()
    
    if (!lottery) {
      console.log('⚠️ No hay loterías activas')
      return
    }
    
    console.log('🧪 Probando inserción de sorteo...')
    
    const testDraw = {
      lottery_id: lottery.id,
      lottery_name: lottery.name,
      winning_animal_number: '01',
      winning_animal_name: 'Carnero',
      draw_time: new Date().toISOString(),
      total_payout: 0,
      winners_count: 0
    }
    
    const { data: createdDraw, error } = await supabase
      .from('draws')
      .insert([testDraw])
      .select()
      .single()
    
    if (error) {
      console.log('❌ Aún hay error:', error.message)
      
      if (error.message.includes('row-level security')) {
        console.log('🔒 RLS todavía está bloqueando')
        console.log('💡 Asegúrate de haber ejecutado: ALTER TABLE draws DISABLE ROW LEVEL SECURITY;')
      }
      return false
    } else {
      console.log('✅ ¡ÉXITO! Sorteo creado directamente en Supabase')
      console.log(`📊 ID del sorteo: ${createdDraw.id}`)
      console.log(`🎰 Lotería: ${createdDraw.lottery_name}`)
      console.log(`🏆 Animal ganador: ${createdDraw.winning_animal_number} - ${createdDraw.winning_animal_name}`)
      
      // Limpiar sorteo de prueba
      const { error: deleteError } = await supabase
        .from('draws')
        .delete()
        .eq('id', createdDraw.id)
      
      if (!deleteError) {
        console.log('🧹 Sorteo de prueba eliminado')
      }
      
      console.log('\\n🎉 ¡RLS ARREGLADO EXITOSAMENTE!')
      console.log('✅ Los sorteos ahora se guardarán directamente en Supabase')
      console.log('✅ No más mensajes de "guardado localmente"')
      console.log('🔄 Prueba crear un sorteo desde la interfaz')
      
      return true
    }
    
  } catch (err) {
    console.log('💥 Error:', err.message)
    return false
  }
}

verifyDrawsRLSFix()