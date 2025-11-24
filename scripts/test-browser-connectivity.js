// Prueba simple de conectividad a Supabase
// Ejecutar en la consola del navegador

console.log('🔍 Probando conectividad a Supabase desde el navegador...')

// Configuración directa
const SUPABASE_URL = 'https://bwwhcuivmqcilspdfayi.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3d2hjdWl2bXFjaWxzcGRmYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA0NzcwMjAsImV4cCI6MjA0NjA1MzAyMH0.LCHBePXrlY_hkNDK_L6lDbNgWGHy7GQWDlTBDyK9I0g'

// Hacer una consulta simple de prueba
fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, {
  method: 'GET',
  headers: {
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'count=exact'
  }
})
.then(response => {
  console.log('✅ Respuesta recibida:', response.status, response.statusText)
  return response.json()
})
.then(data => {
  console.log('📊 Datos recibidos:', data)
  console.log('🎉 ¡Conectividad a Supabase confirmada!')
})
.catch(error => {
  console.error('❌ Error de conectividad:', error)
})