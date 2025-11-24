// Script para ejecutar en la consola del navegador para verificar el estado del hook

// Verificar localStorage
console.log('📦 Datos en localStorage:');
const localData = localStorage.getItem('supabase_bets_backup_v2');
if (localData) {
  const bets = JSON.parse(localData);
  console.log(`✅ ${bets.length} jugadas en localStorage`);
  console.log('📋 Primeras 3:', bets.slice(0, 3));
} else {
  console.log('❌ No hay datos en localStorage');
}

// También verificar otros stores
console.log('📊 Otros stores en localStorage:');
for (let i = 0; i < localStorage.length; i++) {
  const key = localStorage.key(i);
  if (key && key.includes('bet')) {
    console.log(`${key}: ${localStorage.getItem(key)?.length} caracteres`);
  }
}