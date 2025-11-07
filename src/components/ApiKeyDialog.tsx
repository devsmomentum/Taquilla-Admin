import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { ApiKey, ApiKeyPermission } from "@/lib/types"
import { toast } from "sonner"

interface ApiKeyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  apiKey?: ApiKey
  currentUserId: string
  onSave: (apiKey: ApiKey) => void
}

const API_KEY_PERMISSIONS: { value: ApiKeyPermission; label: string; description: string }[] = [
  { value: "create_bets", label: "Crear Jugadas", description: "Permite registrar jugadas desde el sistema externo" },
  { value: "read_lotteries", label: "Leer Loterías", description: "Acceso a consultar loterías disponibles" },
  { value: "read_draws", label: "Leer Sorteos", description: "Acceso a resultados de sorteos realizados" },
  { value: "read_winners", label: "Leer Ganadores", description: "Acceso a listado de jugadas ganadoras" },
]

function generateApiKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let key = "sk_"
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return key
}

export function ApiKeyDialog({ open, onOpenChange, apiKey, currentUserId, onSave }: ApiKeyDialogProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [permissions, setPermissions] = useState<ApiKeyPermission[]>([])

  useEffect(() => {
    if (apiKey) {
      setName(apiKey.name)
      setDescription(apiKey.description)
      setIsActive(apiKey.isActive)
      setPermissions(apiKey.permissions)
    } else {
      setName("")
      setDescription("")
      setIsActive(true)
      setPermissions(["create_bets", "read_lotteries"])
    }
  }, [apiKey, open])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error("El nombre es requerido")
      return
    }

    if (permissions.length === 0) {
      toast.error("Debe seleccionar al menos un permiso")
      return
    }

    const newApiKey: ApiKey = {
      id: apiKey?.id || crypto.randomUUID(),
      name: name.trim(),
      key: apiKey?.key || generateApiKey(),
      description: description.trim(),
      isActive,
      permissions,
      createdAt: apiKey?.createdAt || new Date().toISOString(),
      createdBy: apiKey?.createdBy || currentUserId,
      lastUsed: apiKey?.lastUsed,
    }

    onSave(newApiKey)
    // No mostrar toast aquí, lo maneja App.tsx
    onOpenChange(false)
  }

  const togglePermission = (permission: ApiKeyPermission) => {
    setPermissions((prev) =>
      prev.includes(permission) ? prev.filter((p) => p !== permission) : [...prev, permission]
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0 pb-4">
          <DialogTitle className="text-xl font-semibold">
            {apiKey ? "Editar API Key" : "Crear Nueva API Key"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {apiKey
              ? "Modifica los permisos y configuración de esta API Key"
              : "Crea una nueva API Key para conectar sistemas de ventas externos de forma segura"}
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto space-y-6 py-2 pr-2">
            {/* Información Básica */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                Información Básica
              </h3>
              
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Nombre del Sistema *
                </Label>
                <Input
                  id="name"
                  placeholder="Ej: Sistema POS Local 1, App Móvil Vendedores"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Descripción
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe para qué se utilizará esta API Key y quién la usará..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none"
                />
              </div>
            </div>

            {/* Permisos de Acceso */}
            <div className="bg-blue-50 p-4 rounded-lg space-y-4 border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                Permisos de Acceso
              </h3>
              <p className="text-xs text-blue-600">
                Selecciona los permisos que tendrá esta API Key. Puedes cambiarlos después.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {API_KEY_PERMISSIONS.map((perm) => (
                  <div 
                    key={perm.value} 
                    className={`flex items-start gap-3 p-3 border rounded-lg transition-colors cursor-pointer hover:bg-white/50 ${
                      permissions.includes(perm.value) 
                        ? 'border-blue-300 bg-blue-50/50' 
                        : 'border-gray-200 bg-white'
                    }`}
                    onClick={() => togglePermission(perm.value)}
                  >
                    <Checkbox
                      id={perm.value}
                      checked={permissions.includes(perm.value)}
                      onCheckedChange={() => togglePermission(perm.value)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor={perm.value}
                        className="text-sm font-medium leading-tight cursor-pointer block"
                      >
                        {perm.label}
                      </label>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {perm.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Estado de la API Key */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                Estado de la API Key
              </h3>
              
              <div className="flex items-center gap-3 p-3 bg-white border rounded-lg">
                <Checkbox 
                  id="isActive" 
                  checked={isActive} 
                  onCheckedChange={(checked) => setIsActive(!!checked)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <label
                    htmlFor="isActive"
                    className="text-sm font-medium cursor-pointer block"
                  >
                    API Key Activa
                  </label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solo las API Keys activas pueden realizar peticiones al sistema. 
                    Puedes desactivarla temporalmente si es necesario.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer con botones */}
          <DialogFooter className="flex-shrink-0 pt-6 border-t bg-white">
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="flex-1 sm:flex-initial"
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="flex-1 sm:flex-initial"
                disabled={!name.trim() || permissions.length === 0}
              >
                {apiKey ? "Guardar Cambios" : "Crear API Key"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
