import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

console.log('🚀 Creando usuarios directamente...\n');

// Hash de las contraseñas
const adminPasswordHash = await bcrypt.hash('admin123', 10);
const userPasswordHash = await bcrypt.hash('usuario123', 10);

const users = [
  {
    name: 'Administrador Principal',
    email: 'admin@loteria.com',
    password_hash: adminPasswordHash,
    is_active: true
  },
  {
    name: 'Juan Pérez',
    email: 'juan@loteria.com',
    password_hash: userPasswordHash,
    is_active: true
  }
];

for (const user of users) {
  console.log(`📝 Insertando usuario: ${user.name}`);
  
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
    
  if (error) {
    console.log(`❌ Error insertando ${user.email}:`, error.message);
  } else {
    console.log(`✅ Usuario ${user.email} creado con ID: ${data.id}`);
  }
}

console.log('\n🎉 Proceso completado!');