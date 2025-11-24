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

async function testLogin() {
  const email = 'maria@loteria.com';
  const password = '123456'; // La contraseña que intentas usar

  console.log(`🔐 Intentando login con ${email}...`);

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    console.error('❌ Error de Login:', error.message);
    console.error('Status:', error.status);
  } else {
    console.log('✅ Login exitoso!');
    console.log('User ID:', data.user.id);
  }
}

testLogin();
