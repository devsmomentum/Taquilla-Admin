#!/usr/bin/env node

// Script para diagnosticar por qué solo se muestra 1 jugada de 2
console.log('🔍 Diagnóstico de Mapeo de Jugadas\n')

console.log('📋 Pasos a seguir:')
console.log('1. Abre la consola de DevTools en tu navegador (F12)')
console.log('2. Ve a la pestaña "Console"')
console.log('3. Busca los siguientes logs:')
console.log('   - "🎯 Mapeando X jugadas de Supabase:"')
console.log('   - "📋 Resultado mapeado:"')
console.log('')
console.log('4. Verifica:')
console.log('   a) ¿Cuántas jugadas dice que está mapeando?')
console.log('   b) ¿El array "Resultado mapeado" tiene 2 elementos?')
console.log('   c) ¿Ambas jugadas tienen todos los campos (id, lotteryId, etc.)?')
console.log('')
console.log('5. También revisa el localStorage:')
console.log('   - En DevTools, ve a "Application" > "Local Storage"')
console.log('   - Busca la clave "supabase_bets_backup_v2"')
console.log('   - ¿Tiene 2 jugadas?')
console.log('')
console.log('6. Si en la consola dice que mapea 2 pero solo se muestra 1:')
console.log('   - El problema está en el componente que renderiza')
console.log('   - Revisa el componente BetsModule o donde se muestran las jugadas')
console.log('')
console.log('7. Si en la consola solo mapea 1:')
console.log('   - El problema está en la query de Supabase')
console.log('   - Puede haber un filtro RLS bloqueando una jugada')
console.log('')

console.log('🔧 Para verificar RLS en Supabase:')
console.log('1. Ve a SQL Editor en Supabase')
console.log('2. Ejecuta:')
console.log(`
SELECT 
  id, 
  lottery_name, 
  animal_name, 
  amount,
  created_at,
  created_by_api_key
FROM bets 
ORDER BY created_at DESC;
`)
console.log('')
console.log('3. ¿Muestra 2 filas?')
console.log('   - SÍ: El problema es RLS o mapeo')
console.log('   - NO: Solo hay 1 jugada en la BD')
console.log('')

console.log('💡 Solución rápida si es RLS:')
console.log('Ejecuta en SQL Editor:')
console.log(`
-- Ver las políticas actuales
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'bets';
`)
console.log('')

console.log('✅ También puedes usar debug-bets.html')
console.log('   Abre el archivo y haz clic en "Listar Jugadas"')
console.log('   para ver cuántas jugadas devuelve Supabase')
