import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { UserCircle, Eye, EyeSlash, Warning } from "@phosphor-icons/react"
import { toast } from "sonner"

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const handleLogin = async () => {
    if (!email || !password) {
      const message = "Por favor ingrese email y contraseña"
      setErrorMessage(message)
      toast.error(message)
      return
    }

    setIsLoading(true)
    setErrorMessage("") // Limpiar error anterior
    try {
      const result = await onLogin(email, password)
      
      if (!result.success) {
        const errorMsg = result.error || "Error al iniciar sesión"
        setErrorMessage(errorMsg)
        toast.error(errorMsg)
      } else {
        toast.success("¡Bienvenido!")
        setErrorMessage("")
      }
    } catch (error) {
      const errorMsg = "Error al iniciar sesión. Por favor intente nuevamente"
      setErrorMessage(errorMsg)
      toast.error(errorMsg)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && email && password) {
      handleLogin()
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCircle className="h-8 w-8 md:h-10 md:w-10 text-primary" weight="fill" />
            </div>
          </div>
          <CardTitle className="text-xl md:text-2xl">Sistema Administrativo</CardTitle>
          <CardDescription className="text-xs md:text-sm">Lotería de Animalitos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {errorMessage && (
            <Alert variant="destructive" className="animate-in fade-in-0 slide-in-from-top-1">
              <Warning className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm md:text-base">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="correo@ejemplo.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                setErrorMessage("") // Limpiar error al escribir
              }}
              onKeyPress={handleKeyPress}
              autoComplete="email"
              className={errorMessage ? "border-destructive" : ""}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm md:text-base">Contraseña</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingrese su contraseña"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setErrorMessage("") // Limpiar error al escribir
                }}
                onKeyPress={handleKeyPress}
                autoComplete="new-password"
                className={`pr-10 [&::-ms-reveal]:hidden [&::-webkit-credentials-auto-fill-button]:hidden ${errorMessage ? "border-destructive" : ""}`}
                style={{ 
                  backgroundImage: 'none',
                  WebkitAppearance: 'none',
                  MozAppearance: 'none'
                }}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-muted/50 focus:outline-none transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={!email || !password || isLoading}
          >
            {isLoading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
