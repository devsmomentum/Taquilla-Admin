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
  // Usamos el usuario que acabamos de crear en el test anterior
  // Nota: Necesitamos saber el email exacto. Crearemos uno nuevo para estar seguros.
  
  const email = `login-test-${Date.now()}@example.com`;
  const password = 'password123';
  
  console.log(`1️⃣ Creando usuario de prueba: ${email}...`);
  
  const { data: userId, error: createError } = await supabase.rpc('create_new_user', {
    email,
    password,
    name: 'Login Test User',
    is_active: true
  });
  
  if (createError) {
    console.error('❌ Error creando usuario:', createError);
    return;
  }
  
  console.log(`✅ Usuario creado con ID: ${userId}`);
  
  console.log(`2️⃣ Intentando login con ${email}...`);

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
    console.log('Access Token:', data.session.access_token.substring(0, 20) + '...');
  }
}

testLogin();
