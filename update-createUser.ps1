# Script para actualizar createUser automáticamente

$filePath = "c:\Users\natac\Desktop\Taquilla_Administrador\src\hooks\use-supabase-users.ts"

# Leer el archivo
$content = Get-Content -Path $filePath -Raw

# Nueva función createUser
$newCreateUser = @'
  const createUser = async (userData: Omit<User, 'id' | 'createdAt'>): Promise<boolean> => {
    // 1. Verificar si el email ya existe localmente
    const existingLocalUser = users.find(u => u.email === userData.email)
    if (existingLocalUser) {
      toast.error('Ya existe un usuario con este email localmente')
      return false
    }

    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const newUser: User = {
      id: newUserId,
      name: userData.name,
      email: userData.email,
      userType: userData.userType || 'admin',
      roleIds: userData.roleIds || [],
      isActive: userData.isActive,
      createdAt: new Date().toISOString(),
      createdBy: userData.createdBy || 'local-system'
    }

    let supabaseSuccess = false

    // 2. Intentar crear en Supabase usando Edge Function
    if (isSupabaseConfigured()) {
      try {
        console.log(`📝 Creando usuario ${userData.email} con Edge Function...`)

        // Obtener sesión para auth
        const { data: session } = await supabase.auth.getSession()
        
        if (!session?.session) {
          toast.error('Debes estar autenticado para crear usuarios')
          return false
        }

        const password = userData.password || '123456' // Contraseña por defecto

        // Llamar a Edge Function
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              password: password,
              roleIds: userData.roleIds,
              userType: userData.userType || 'admin',
              isActive: userData.isActive ?? true
            })
          }
        )

        const result = await response.json()

        if (!response.ok) {
          console.error('Error de Edge Function:', result)
          throw new Error(result.error || 'Error al crear usuario')
        }

        // Usuario creado exitosamente
        newUser.id = result.userId
        supabaseSuccess = true
        console.log('✅ Usuario creado completamente:', result)
        toast.success('Usuario creado en Authentication y base de datos')

      } catch (error: any) {
        console.error('❌ Error creando usuario:', error)
        
        // Manejo de errores específicos
        if (error.message.includes('ya está registrado')) {
          toast.error(`El email ${userData.email} ya está registrado`)
          return false
        }
        
        toast.error(`Error: ${error.message}`)
        return false
      }
    }

    // 3. Guardar localmente
    const updatedUsers = [...users, newUser]
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)

    if (!isSupabaseConfigured()) {
      toast.success('Usuario creado localmente (Supabase no configurado)')
    }

    return true
  }
'@

# Patrón regex para encontrar la función
$pattern = '(?s)  // Crear nuevo usuario.*?return true\s+}'

if ($content -match $pattern) {
    $content = $content -replace $pattern, $newCreateUser
    Set-Content -Path $filePath -Value $content -NoNewline
    Write-Host "✅ Función createUser actualizada exitosamente"
} else {
    Write-Host "❌ No se pudo encontrar la función createUser"
}
