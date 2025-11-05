# Integración con Supabase - Sistema de Lotería de Animalitos

## ✅ Módulo 1: LOGIN - COMPLETADO

### Lo que se ha implementado:

1. **Cliente de Supabase configurado** (`src/lib/supabase.ts`)
   - Conexión con Supabase usando las credenciales del `.env`
   - Tipos TypeScript completos para todas las tablas
   - Preparado para todas las operaciones CRUD

2. **Hook de autenticación** (`src/hooks/use-supabase-auth.ts`)
   - Función `login()` - Autentica usuarios contra la base de datos
   - Función `logout()` - Cierra sesión del usuario
   - Función `hasPermission()` - Verifica permisos del usuario
   - Carga automática de datos del usuario desde la vista `users_with_roles`
   - Manejo de sesiones con `useKV` para persistencia

3. **Pantalla de Login actualizada** (`src/components/LoginScreen.tsx`)
   - Input de email y contraseña
   - Validación de credenciales contra Supabase
   - Mensajes de error apropiados
   - Botón para mostrar/ocultar contraseña
   - Diseño responsive

4. **App.tsx actualizado**
   - Usa el nuevo hook `useSupabaseAuth`
   - Pantalla de carga mientras verifica sesión
   - Redirect automático al login si no está autenticado

### Cómo funciona el login:

```typescript
// 1. Usuario ingresa email y contraseña
// 2. Se busca el usuario en la tabla 'users' por email
// 3. Se verifica que el usuario esté activo (is_active = true)
// 4. Se compara la contraseña (actualmente sin hash - ver nota abajo)
// 5. Si todo es correcto, se carga la información completa del usuario desde 'users_with_roles'
// 6. El usuario ya tiene acceso al sistema con sus permisos cargados
```

### ⚠️ IMPORTANTE - Seguridad de Contraseñas:

**Estado actual:** Las contraseñas se almacenan en texto plano en la base de datos para facilitar el desarrollo inicial.

**Para producción:** Debes implementar hash de contraseñas. Opciones:
1. Usar funciones de PostgreSQL (pg crypto)
2. Hash en el cliente antes de enviar
3. Implementar un backend intermedio con bcrypt/argon2

### Datos de prueba:

Para probar el login, necesitas crear un usuario en Supabase. Ejecuta este SQL en el editor de Supabase:

```sql
-- Primero obtén el ID del rol de administrador
SELECT id FROM roles WHERE name = 'Administrador';

-- Luego crea el usuario (reemplaza 'ROLE_ID_AQUI' con el ID real)
INSERT INTO users (name, email, password_hash, is_active, created_by)
VALUES ('Admin Principal', 'admin@loteria.com', 'admin123', true, NULL);

-- Obtén el ID del usuario que acabas de crear
SELECT id FROM users WHERE email = 'admin@loteria.com';

-- Asigna el rol al usuario (reemplaza los IDs)
INSERT INTO user_roles (user_id, role_id)
VALUES ('USER_ID_AQUI', 'ROLE_ID_AQUI');
```

O más fácil, usa este script completo:

```sql
DO $$
DECLARE
  admin_role_id UUID;
  new_user_id UUID;
BEGIN
  -- Obtener el rol de administrador
  SELECT id INTO admin_role_id FROM roles WHERE name = 'Administrador' LIMIT 1;
  
  -- Crear el usuario
  INSERT INTO users (name, email, password_hash, is_active)
  VALUES ('Admin Principal', 'admin@loteria.com', 'admin123', true)
  RETURNING id INTO new_user_id;
  
  -- Asignar el rol
  INSERT INTO user_roles (user_id, role_id)
  VALUES (new_user_id, admin_role_id);
  
  RAISE NOTICE 'Usuario creado con ID: %', new_user_id;
END $$;
```

---

## 📋 Próximos Módulos a Integrar

### Módulo 2: ROLES (Pendiente)
- Leer roles desde `roles` table
- Crear/editar/eliminar roles
- Actualizar permisos

### Módulo 3: USUARIOS (Pendiente)
- Leer usuarios desde `users_with_roles` view
- Crear nuevos usuarios
- Editar usuarios existentes
- Asignar/remover roles
- Activar/desactivar usuarios

### Módulo 4: LOTERÍAS (Pendiente)
- Leer loterías desde `lotteries` table
- Crear/editar/eliminar loterías
- Gestionar premios (tabla `prizes`)

### Módulo 5: JUGADAS/BETS (Pendiente)
- Leer jugadas desde `bets` table
- Crear nuevas jugadas
- Calcular premios potenciales
- Actualizar balance de potes

### Módulo 6: SORTEOS/DRAWS (Pendiente)
- Realizar sorteos
- Marcar ganadores en la tabla `bets`
- Registrar resultados en `draws`
- Calcular y distribuir premios

### Módulo 7: POTES (Pendiente)
- Leer balances desde `pots` table
- Actualizar balances
- Realizar transferencias
- Registrar en `transfers` table

### Módulo 8: RETIROS (Pendiente)
- Registrar retiros en `withdrawals` table
- Actualizar balance de potes
- Historial de retiros

### Módulo 9: API KEYS (Pendiente)
- Gestionar API keys para acceso externo
- Generar claves seguras
- Verificar permisos de API keys

### Módulo 10: REPORTES (Pendiente)
- Usar las vistas: `lottery_statistics`, `pots_summary`
- Generar estadísticas en tiempo real
- Reportes de ventas y pagos

---

## 🔧 Verificación de la Integración

### 1. Verifica que el archivo .env existe:
```bash
cat .env
```

Deberías ver:
```
VITE_SUPABASE_URL=https://dxfivioylmbpumzcpwtu.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2. Verifica que las tablas existen en Supabase:
Ve a tu proyecto en Supabase > Table Editor y verifica que tienes:
- ✅ users
- ✅ roles
- ✅ user_roles
- ✅ lotteries
- ✅ prizes
- ✅ bets
- ✅ draws
- ✅ pots
- ✅ transfers
- ✅ withdrawals
- ✅ api_keys

### 3. Verifica que las vistas existen:
- ✅ users_with_roles
- ✅ lottery_statistics
- ✅ pots_summary

### 4. Verifica que RLS está configurado:
Ve a Supabase > Authentication > Policies y verifica que cada tabla tiene sus políticas.

---

## 🐛 Solución de Problemas

### Error: "Faltan las credenciales de Supabase"
**Solución:** Verifica que el archivo `.env` existe y tiene las variables correctas.

### Error: "relation users_with_roles does not exist"
**Solución:** Ejecuta el script completo `supabase-schema.sql` en el SQL Editor de Supabase.

### Error: "Credenciales incorrectas" pero los datos son correctos
**Solución:** Verifica que el usuario existe y está activo en la base de datos:
```sql
SELECT * FROM users WHERE email = 'tu@email.com';
```

### Las vistas están "UNRESTRICTE D"
**Solución:** Las vistas heredan las políticas de las tablas subyacentes, esto es normal. Las políticas en las tablas `users`, `roles`, etc. controlan el acceso.

---

## 📝 Notas Técnicas

### Arquitectura de Autenticación:
- **NO** usamos Supabase Auth (el sistema de autenticación integrado)
- Usamos **autenticación personalizada** contra la tabla `users`
- Esto permite mayor control sobre roles y permisos
- Los permisos se gestionan a través de la tabla `roles` y `user_roles`

### Sesiones:
- Las sesiones se mantienen usando `useKV` (persistencia local)
- Solo se almacena el `userId`
- Los datos del usuario se recargan desde Supabase en cada sesión
- Esto asegura que los permisos estén siempre actualizados

### Permisos:
- Los permisos se definen en la tabla `roles`
- Un usuario puede tener múltiples roles
- Los permisos se combinan (unión de todos los roles del usuario)
- La vista `users_with_roles` pre-calcula todos los permisos

---

## 🚀 Próximo Paso

**¿Qué módulo quieres integrar primero?**

Recomiendo este orden:
1. ✅ **LOGIN** - COMPLETADO
2. **ROLES** - Gestión de roles y permisos
3. **USUARIOS** - Crear y gestionar usuarios
4. **LOTERÍAS** - Configurar loterías y premios
5. **POTES** - Sistema de balance
6. **JUGADAS** - Registrar apuestas
7. **SORTEOS** - Realizar sorteos y pagar premios
8. **HISTORIAL** - Transferencias y retiros
9. **API KEYS** - Acceso externo
10. **REPORTES** - Estadísticas y análisis

Dime cuál módulo quieres que integre ahora y lo haré paso a paso.
