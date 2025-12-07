import { Navigate } from 'react-router-dom'
import { LoginScreen } from '@/components/LoginScreen'
import { useSupabaseAuth } from '@/hooks/use-supabase-auth'

export default function LoginRoute() {
  const { currentUser, login } = useSupabaseAuth()
  if (currentUser) return <Navigate to="/" replace />
  return <LoginScreen onLogin={login} />
}
