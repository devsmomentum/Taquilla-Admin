# Script para actualizar la función deleteUser automáticamente
# Lo haré manualmente por ti

$filePath = "c:\Users\natac\Desktop\Taquilla_Administrador\src\hooks\use-supabase-users.ts"

# Leer el archivo
$content = Get-Content -Path $filePath -Raw

# Definir la nueva función
$newDeleteUser = @'
  // Eliminar usuario (Auth + Public usando Edge Function)
  const deleteUser = async (userId: string): Promise<boolean> => {
    if (isSupabaseConfigured()) {
      try {
        console.log('🗑️ Eliminando usuario completamente:', userId)
        
        // Llamar a Edge Function que elimina de Auth + Public
        const { data: session } = await supabase.auth.getSession()
        
        if (!session?.session) {
          toast.error('Debes estar autenticado para eliminar usuarios')
          return false
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.session.access_token}`,
            },
            body: JSON.stringify({ userId })
          }
        )

        const result = await response.json()

        if (!response.ok) {
          console.error('Error de Edge Function:', result)
          
          // Fallback: Intentar método RPC tradicional
          console.warn('Edge Function falló, intentando RPC fallback...')
          const { error: rpcError } = await supabase.rpc('delete_user_completely', {
            target_user_id: userId
          })

          if (rpcError) {
            console.warn('RPC también falló:', rpcError.message)
            
            // Último recurso: solo borrar de public
            await supabase.from('user_roles').delete().eq('user_id', userId)
            const { error: deleteError } = await supabase.from('users').delete().eq('id', userId)
            
            if (deleteError) {
              throw deleteError
            }
            
            toast.warning('Usuario eliminado de la base de datos, pero permanece en Auth (elimina manualmente desde Dashboard)')
          } else {
            toast.success('Usuario eliminado completamente')
          }
        } else {
          console.log('✅ Usuario eliminado completamente:', result)
          toast.success('Usuario eliminado de Auth y base de datos')
        }

      } catch (error: any) {
        console.error('Error eliminando usuario:', error)
        toast.error(`Error: ${error.message}`)
        return false
      }
    }

    // Eliminar localmente
    const updatedUsers = users.filter(user => user.id !== userId)
    setUsers(updatedUsers)
    saveLocalUsers(updatedUsers)

    if (!isSupabaseConfigured()) {
      toast.success('Usuario eliminado localmente')
    }

    return true
  }
'@

# Buscar y reemplazar usando regex
$pattern = '(?s)  // Eliminar usuario \(Supabase \+ Local\).*?return true\s+}'

if ($content -match $pattern) {
    $content = $content -replace $pattern, $newDeleteUser
    Set-Content -Path $filePath -Value $content -NoNewline
    Write-Host "✅ Función deleteUser actualizada exitosamente"
} else {
    Write-Host "❌ No se pudo encontrar la función deleteUser para reemplazar"
    Write-Host "Por favor, hazlo manualmente copiando el código de deleteUser-updated.ts"
}
