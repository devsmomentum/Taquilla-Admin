// Script para limpiar localStorage de potes
console.log('🧹 Limpiando datos de potes en localStorage...')

const keysToRemove = [
  'supabase_pots_backup_v2',
  'pots',
  'transfers',
  'withdrawals'
]

keysToRemove.forEach(key => {
  const value = localStorage.getItem(key)
  if (value) {
    console.log(`❌ Removiendo: ${key}`)
    console.log(`   Valor anterior: ${value.substring(0, 100)}...`)
    localStorage.removeItem(key)
  } else {
    console.log(`✓ ${key} ya está vacío`)
  }
})

console.log('\n✅ localStorage limpiado!')
console.log('🔄 Recarga la página para ver los cambios')
