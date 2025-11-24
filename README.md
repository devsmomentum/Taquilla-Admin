# Taquilla Admin

Sistema administrativo para la gestión de taquillas, ventas y sorteos de lotería.

## Tecnologías

- **Frontend:** React, TypeScript, Vite
- **Estilos:** Tailwind CSS, Shadcn UI
- **Backend/Base de Datos:** Supabase
- **Iconos:** Phosphor Icons, Lucide React

## Requisitos

- Node.js (v18 o superior)
- NPM o Yarn

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/devsmomentum/Taquilla-Admin.git
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno:
   - Copiar `.env.example` a `.env.local` (si existe) o configurar las credenciales de Supabase.

4. Iniciar servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Estructura del Proyecto

- `/src`: Código fuente de la aplicación (Componentes, Hooks, Páginas).
- `/scripts`: Scripts de mantenimiento, migración y utilidades de base de datos.
- `/public`: Archivos estáticos.

## Scripts Disponibles

- `npm run dev`: Inicia el servidor de desarrollo.
- `npm run build`: Compila la aplicación para producción.
- `npm run lint`: Ejecuta el linter para verificar el código.
