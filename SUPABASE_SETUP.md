# Configuración de Supabase para Lotería de Animalitos

Este documento explica cómo configurar Supabase para el sistema de Lotería de Animalitos.

## Requisitos Previos

1. Cuenta en [Supabase](https://supabase.com)
2. Proyecto de Supabase creado

## Paso 1: Crear el Proyecto en Supabase

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Crea un nuevo proyecto
3. Guarda las credenciales que aparecen:
   - **Project URL**: `https://xxx.supabase.co`
   - **Anon/Public Key**: `eyJhbGc...`

## Paso 2: Ejecutar el Script SQL

1. En el Dashboard de Supabase, ve a **SQL Editor**
2. Crea una nueva consulta
3. Copia y pega el contenido completo del archivo `supabase-schema.sql`
4. Ejecuta el script (botón **Run** o `Ctrl+Enter`)
5. Verifica que todas las tablas se hayan creado correctamente en la sección **Table Editor**

## Paso 3: Configurar Variables de Entorno

1. Copia el archivo `.env.example` y renómbralo a `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edita el archivo `.env` y agrega tus credenciales:
   ```env
   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key-aqui
   ```

## Paso 4: Configurar Autenticación (Opcional)

Si deseas usar la autenticación de Supabase:

1. Ve a **Authentication** > **Providers**
2. Habilita **Email** como proveedor
3. Configura las políticas de contraseña según tus necesidades

## Paso 5: Crear el Usuario Administrador Inicial

Una vez que el schema esté creado, ejecuta este SQL para crear el primer usuario administrador:

```sql
-- Primero, inserta el usuario
INSERT INTO users (id, name, email, password_hash, is_active, created_by)
VALUES (
  uuid_generate_v4(),
  'Administrador Principal',
  'admin@loteria.com',
  crypt('admin123', gen_salt('bf')), -- Cambia 'admin123' por una contraseña segura
  TRUE,
  (SELECT id FROM users LIMIT 1) -- Será NULL para el primer usuario
)
RETURNING id;

-- Guarda el ID que te devuelve y úsalo en la siguiente consulta
-- Asigna el rol de administrador al usuario
INSERT INTO user_roles (user_id, role_id)
SELECT 
  '<UUID_DEL_USUARIO>', -- Reemplaza con el ID del paso anterior
  id
FROM roles
WHERE name = 'Administrador';
```

## Estructura de la Base de Datos

El script crea las siguientes tablas principales:

### Tablas de Usuarios y Permisos
- **roles**: Roles del sistema con permisos modulares
- **users**: Usuarios del sistema
- **user_roles**: Relación entre usuarios y roles
- **api_keys**: Claves API para sistemas externos

### Tablas del Negocio
- **lotteries**: Loterías configuradas
- **prizes**: Premios por animal en cada lotería
- **bets**: Jugadas realizadas
- **draws**: Resultados de sorteos
- **pots**: Potes del sistema (premios, reserva, ganancias)
- **transfers**: Transferencias entre potes
- **withdrawals**: Retiros de ganancias

## Políticas de Seguridad (RLS)

El script configura Row Level Security (RLS) con las siguientes políticas:

### Roles
- Cualquiera puede ver roles
- Solo usuarios con permiso `roles` pueden crear/editar/eliminar roles personalizados
- Los roles del sistema están protegidos contra modificación

### Usuarios
- Usuarios autenticados pueden ver todos los usuarios
- Solo usuarios con permiso `users` pueden crear/editar/eliminar usuarios
- Los usuarios pueden editar su propio perfil
- No se puede eliminar a uno mismo

### Loterías y Premios
- Usuarios autenticados pueden ver loterías y premios
- Solo usuarios con permiso `lotteries` pueden modificarlas

### Jugadas
- Usuarios autenticados pueden ver jugadas
- Usuarios con permiso `bets` pueden crear jugadas
- Usuarios con permiso `winners` pueden marcar ganadores

### Potes y Transacciones
- Usuarios autenticados pueden ver potes y transacciones
- Solo usuarios con permiso `dashboard` pueden realizar transferencias y retiros

### API Keys
- Solo usuarios con permiso `api-keys` pueden ver y gestionar API keys

## Funciones Importantes

### `get_user_permissions(user_uuid)`
Obtiene todos los permisos de un usuario combinando sus roles:
```sql
SELECT get_user_permissions('uuid-del-usuario');
```

### `verify_api_key(api_key_hash)`
Verifica si una API key es válida y actualiza su último uso:
```sql
SELECT * FROM verify_api_key('hash-de-la-key');
```

## Vistas Útiles

### `users_with_roles`
Muestra usuarios con sus roles y permisos agregados.

### `lottery_statistics`
Estadísticas por lotería (jugadas, ganadores, montos).

### `pots_summary`
Resumen de potes con balances y porcentajes actuales.

## Índices

El script crea índices automáticos para optimizar consultas frecuentes:
- Búsquedas por email, nombre
- Filtros por fecha
- Relaciones entre tablas
- Estados (activo/inactivo)

## Triggers

Se configuran triggers automáticos para:
- Actualizar el campo `updated_at` en modificaciones
- Mantener la integridad referencial

## Seguridad

### Recomendaciones:
1. **Cambia las contraseñas por defecto** inmediatamente
2. **Usa contraseñas fuertes** para el usuario administrador
3. **Guarda las API keys de forma segura** y nunca las expongas en el código
4. **Revisa los logs** regularmente en el Dashboard de Supabase
5. **Habilita autenticación de dos factores** en tu cuenta de Supabase
6. **Configura backups automáticos** en la configuración del proyecto

## Migración de Datos Existentes

Si ya tienes datos en el sistema y deseas migrarlos a Supabase:

1. Exporta los datos actuales desde el `localStorage` usando las DevTools del navegador
2. Transforma los datos al formato de las tablas de Supabase
3. Importa usando el SQL Editor o la API de Supabase

## Soporte

Para problemas con Supabase:
- [Documentación oficial](https://supabase.com/docs)
- [Discord de Supabase](https://discord.supabase.com)
- [GitHub Issues](https://github.com/supabase/supabase/issues)

## Próximos Pasos

Después de configurar la base de datos:

1. Instala el cliente de Supabase:
   ```bash
   npm install @supabase/supabase-js
   ```

2. Actualiza los componentes para usar Supabase en lugar de `useKV`

3. Implementa la autenticación con Supabase Auth

4. Configura sincronización en tiempo real con Supabase Realtime
