console.log('🔍 DIAGNÓSTICO RÁPIDO - Ejecuta en la consola del navegador');
console.log('='.repeat(60));

// 1. Verificar localStorage
console.log('\n📦 1. Verificando localStorage:');
const draws = localStorage.getItem('supabase_draws_backup_v2');
const pots = localStorage.getItem('supabase_pots_backup_v2');
console.log('Sorteos:', draws ? `${JSON.parse(draws).length} registros` : 'VACÍO');
console.log('Potes:', pots ? `${JSON.parse(pots).length} registros` : 'VACÍO');

if (draws) {
  console.log('\n📋 Sorteos en caché:');
  JSON.parse(draws).forEach((d, i) => {
    console.log(`  ${i+1}. ${d.lotteryName || d.lottery_name} - ${d.winningAnimalNumber || d.winning_animal_number} ${d.winningAnimalName || d.winning_animal_name}`);
  });
}

// 2. Limpiar caché
console.log('\n🧹 2. Para limpiar el caché y forzar recarga desde Supabase:');
console.log('Ejecuta: localStorage.clear(); location.reload()');

console.log('\n✅ Si ves sorteos en caché pero no en la app, ejecuta el comando de arriba');
