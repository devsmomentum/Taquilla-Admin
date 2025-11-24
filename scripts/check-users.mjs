import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🔍 Verificando usuarios en la base de datos...\n');

const { data, error } = await supabase
  .from('users')
  .select('id, email, password_hash, is_active, name');

if (error) {
  console.error('❌ Error:', error);
} else {
  console.log(`📊 Usuarios encontrados: ${data.length}\n`);
  
  data.forEach((user, index) => {
    console.log(`${index + 1}. ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Activo: ${user.is_active ? '✅' : '❌'}`);
    console.log(`   Password: ${user.password_hash ? '✅ Configurada' : '❌ NO configurada'}`);
    if (user.password_hash) {
      console.log(`   Hash: ${user.password_hash.substring(0, 30)}...`);
    }
    console.log('');
  });
}