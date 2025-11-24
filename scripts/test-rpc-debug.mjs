import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Error: Faltan variables de entorno');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testRpc() {
  console.log('🚀 Probando función RPC create_new_user...');
  
  const testEmail = `test-${Date.now()}@example.com`;
  console.log(`📧 Intentando crear usuario: ${testEmail}`);

  try {
    const { data, error } = await supabase.rpc('create_new_user', {
      email: testEmail,
      password: 'password123',
      name: 'Usuario Test RPC',
      is_active: true
    });

    if (error) {
      console.error('❌ Error RPC:', error);
      console.error('Mensaje:', error.message);
      console.error('Detalles:', error.details);
      console.error('Hint:', error.hint);
    } else {
      console.log('✅ Éxito! ID del nuevo usuario:', data);
      console.log('🎉 La función RPC está instalada y funcionando correctamente.');
    }
  } catch (err) {
    console.error('❌ Excepción inesperada:', err);
  }
}

testRpc();
