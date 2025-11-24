// Script para ejecutar en la consola del navegador
// Configura datos iniciales para probar el módulo de potes

console.log('🏦 Configurando datos iniciales para el módulo de potes...');

// Datos iniciales de potes con balances para pruebas
const initialPots = [
  {
    name: 'Pote de Premios',
    percentage: 70,
    balance: 5000, // $5,000 inicial
    color: '#10b981',
    description: 'Dinero disponible para pagar premios a los ganadores'
  },
  {
    name: 'Pote de Reserva',
    percentage: 20,
    balance: 2000, // $2,000 inicial
    color: '#f59e0b', 
    description: 'Fondo de reserva para contingencias'
  },
  {
    name: 'Pote de Ganancias',
    percentage: 10,
    balance: 1500, // $1,500 inicial
    color: '#ef4444',
    description: 'Ganancias netas del negocio'
  }
];

// Establecer datos en localStorage
localStorage.setItem('pots', JSON.stringify(initialPots));
localStorage.setItem('transfers', JSON.stringify([]));
localStorage.setItem('withdrawals', JSON.stringify([]));

console.log('✅ Datos configurados en localStorage:');
console.log('💰 Pote de Premios: $5,000');
console.log('🛡️ Pote de Reserva: $2,000'); 
console.log('💵 Pote de Ganancias: $1,500');
console.log('');
console.log('🧪 Ahora puedes probar:');
console.log('1. Pestaña "Potes": Ver los balances iniciales');
console.log('2. Crear apuestas: Aumentarán automáticamente los potes');
console.log('3. Transferencias: Mover dinero entre potes');
console.log('4. Retiros: Sacar dinero del pote de ganancias');
console.log('');
console.log('🔄 Recarga la página para ver los cambios');

// Recargar la página automáticamente
window.location.reload();