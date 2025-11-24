#!/usr/bin/env node

/**
 * 🎯 IDENTIFICAR DÓNDE SE GUARDAN LAS JUGADAS EN SUPABASE
 * =====================================================
 * 
 * Script para mostrar qué tablas almacenan las jugadas/apuestas
 * y cómo visualizar los registros en Supabase Dashboard.
 */

console.log('🎯 DÓNDE SE VEN LAS JUGADAS EN SUPABASE');
console.log('====================================\n');

console.log('📊 TABLA PRINCIPAL PARA JUGADAS/APUESTAS:');
console.log('========================================');
console.log('📋 TABLA: "bets" (apuestas/jugadas)');
console.log('• Esta es la tabla principal donde se guardan todas las jugadas');
console.log('• Cada registro representa una apuesta individual');
console.log('• Contiene: números jugados, montos, fecha, usuario, lotería, etc.\n');

console.log('🔍 CÓMO VER LAS JUGADAS EN SUPABASE:');
console.log('===================================');
console.log('1️⃣ Ve a: https://supabase.com/dashboard/project/dxfivioylmbpumzcpwtu/editor');
console.log('2️⃣ Busca la tabla "bets" en el menú lateral');
console.log('3️⃣ Haz clic en "bets" para ver todos los registros');
console.log('4️⃣ Verás columnas como:');
console.log('   • id: Identificador único');
console.log('   • user_id: Usuario que hizo la jugada');
console.log('   • lottery_id: Lotería donde apostó');
console.log('   • numbers: Números jugados');
console.log('   • amount: Monto apostado');
console.log('   • created_at: Fecha y hora de la jugada');
console.log('   • type: Tipo de jugada (directa, pale, etc.)');

console.log('\n📋 TABLAS RELACIONADAS:');
console.log('======================');
console.log('• "lotteries" → Información de las loterías disponibles');
console.log('• "users" → Datos de los usuarios que juegan');
console.log('• "draws" → Sorteos/resultados de las loterías');
console.log('• "prizes" → Premios ganados por las jugadas');

console.log('\n💡 CONSULTAS ÚTILES EN SQL EDITOR:');
console.log('=================================');

const queries = `
-- Ver todas las jugadas recientes
SELECT 
    b.id,
    b.numbers as "Números Jugados",
    b.amount as "Monto (Bs.)",
    b.type as "Tipo",
    l.name as "Lotería",
    u.email as "Usuario",
    b.created_at as "Fecha"
FROM bets b
LEFT JOIN lotteries l ON b.lottery_id = l.id
LEFT JOIN users u ON b.user_id = u.id
ORDER BY b.created_at DESC
LIMIT 20;

-- Contar jugadas por usuario
SELECT 
    u.email as "Usuario",
    COUNT(b.id) as "Total Jugadas",
    SUM(b.amount) as "Total Apostado (Bs.)"
FROM bets b
JOIN users u ON b.user_id = u.id
GROUP BY u.email
ORDER BY COUNT(b.id) DESC;

-- Ver jugadas de hoy
SELECT 
    numbers as "Números",
    amount as "Monto",
    type as "Tipo",
    created_at as "Hora"
FROM bets 
WHERE DATE(created_at) = CURRENT_DATE
ORDER BY created_at DESC;
`;

console.log(queries);

console.log('\n🎯 RESPUESTA DIRECTA:');
console.log('====================');
console.log('✅ Las jugadas se guardan en la tabla: "bets"');
console.log('✅ Para verlas: Dashboard → Editor → Tabla "bets"');
console.log('✅ Link directo: https://supabase.com/dashboard/project/dxfivioylmbpumzcpwtu/editor');

console.log('\n📱 SI NO VES JUGADAS:');
console.log('====================');
console.log('• Verifica que la app esté guardando en Supabase');
console.log('• Revisa si hay errores de RLS en la tabla "bets"');
console.log('• Confirma que el usuario esté autenticado correctamente');

console.log('\n🔧 VERIFICAR ESTADO DE LA TABLA "bets":');
const verifyQuery = `
-- Ejecuta en SQL Editor para verificar RLS en bets
SELECT 
    tablename,
    rowsecurity as "RLS_Activo"
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'bets';
`;
console.log(verifyQuery);