// Script de diagnóstico para ejecutar en la consola del navegador
// Copia y pega esto en la consola del navegador (F12) cuando esté en la aplicación

console.log('🔍 DIAGNÓSTICO DE JUGADAS EN LA UI');

// 1. Verificar si React está cargado
console.log('1️⃣ Verificando React...');
if (window.React) {
  console.log('✅ React está disponible');
} else {
  console.log('❌ React no está disponible');
}

// 2. Verificar store de Spark
console.log('2️⃣ Verificando stores locales...');
const sparkStore = window.localStorage;
let betKeys = [];
for (let i = 0; i < sparkStore.length; i++) {
  const key = sparkStore.key(i);
  if (key && key.toLowerCase().includes('bet')) {
    betKeys.push(key);
  }
}

console.log(`📊 Claves relacionadas con bets: ${betKeys.length}`);
betKeys.forEach(key => {
  const data = sparkStore.getItem(key);
  try {
    const parsed = JSON.parse(data);
    console.log(`   ${key}: ${Array.isArray(parsed) ? parsed.length + ' items' : typeof parsed}`);
  } catch (e) {
    console.log(`   ${key}: ${data?.length || 0} caracteres (no JSON)`);
  }
});

// 3. Verificar conexión con Supabase
console.log('3️⃣ Probando conexión con Supabase...');
fetch('https://dxfivioylmbpumzcpwtu.supabase.co/rest/v1/bets?select=count', {
  method: 'HEAD',
  headers: {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR4Zml2aW95bG1icHVtemNwd3R1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyNTI0MTksImV4cCI6MjA3NzgyODQxOX0.QlDhKclyo55RHIlz4sQC2G7yBy-L4KsZiaMBpWhXs-w'
  }
})
.then(response => {
  console.log(`✅ Conexión con Supabase: ${response.ok ? 'OK' : 'ERROR'}`);
  console.log(`📊 Status: ${response.status}`);
})
.catch(error => {
  console.log('❌ Error de conexión:', error.message);
});

// 4. Instrucciones para el usuario
console.log('4️⃣ Instrucciones para completar el diagnóstico:');
console.log('   a) Ve a la pestaña "Jugadas" en la aplicación');
console.log('   b) Abre las herramientas de desarrollo (ya están abiertas)');
console.log('   c) Observa los logs que aparecen en esta consola');
console.log('   d) Intenta crear una nueva jugada');
console.log('   e) Reporta qué logs aparecen después de crear la jugada');