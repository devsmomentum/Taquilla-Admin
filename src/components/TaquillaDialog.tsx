import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Info } from '@phosphor-icons/react'
import type { Agency } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (taq: { fullName: string; address: string; telefono: string; email: string; password?: string; agencyId?: string; shareOnSales: number; shareOnProfits: number }) => Promise<boolean>
  agencies: Agency[]
  defaultAgencyId?: string
  currentUserEmail?: string
}

export function TaquillaDialog({ open, onOpenChange, onSave, agencies, defaultAgencyId, currentUserEmail }: Props) {
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agencyId, setAgencyId] = useState<string | undefined>(undefined)
  const [shareOnSales, setShareOnSales] = useState('')
  const [shareOnProfits, setShareOnProfits] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Obtener la agencia seleccionada y sus límites de porcentaje
  const selectedAgency = useMemo(() => {
    if (!agencyId) return null
    return agencies.find(a => a.id === agencyId) || null
  }, [agencyId, agencies])

  const maxShareOnSales = selectedAgency?.shareOnSales ?? 100
  const maxShareOnProfits = selectedAgency?.shareOnProfits ?? 100

  useEffect(() => {
    if (!open) {
      setFullName(''); setAddress(''); setTelefono(''); setEmail(''); setPassword(''); setAgencyId(undefined)
      setShareOnSales(''); setShareOnProfits('')
      setErrors({})
    } else {
      // Cargar agencias desde localStorage si no vienen en props
      let agenciasParaBuscar = agencies || []
      if (agenciasParaBuscar.length === 0) {
        try {
          const stored = localStorage.getItem('taquilla-agencies')
          if (stored) {
            agenciasParaBuscar = JSON.parse(stored)
          }
        } catch (e) {
          console.error('Error cargando agencias:', e)
        }
      }

      // Auto-seleccionar agencia
      if (defaultAgencyId) {
        setAgencyId(defaultAgencyId)
      } else if (agenciasParaBuscar.length === 1) {
        setAgencyId(agenciasParaBuscar[0].id)
      } else if (agenciasParaBuscar.length > 0) {
        // Obtener email
        let userEmail = currentUserEmail
        if (!userEmail) {
          try {
            const authData = JSON.parse(localStorage.getItem('supabase.auth.token') || '{}')
            userEmail = authData.currentSession?.user?.email
          } catch (e) { }
        }

        if (userEmail) {
          // Buscar por userEmail exacto
          const myAgency = agenciasParaBuscar.find((a: any) => a.userEmail === userEmail)
          if (myAgency) {
            setAgencyId(myAgency.id)
          } else {
            // Fallback: buscar por nombre
            const emailPrefix = userEmail.split('@')[0].toLowerCase().replace('agencia', '').replace('s', '')
            const agencyByName = agenciasParaBuscar.find((a: any) => {
              const agencyName = a.name?.toLowerCase().replace(/\s+/g, '').replace('agencia', '') || ''
              return agencyName.includes(emailPrefix) || emailPrefix.includes(agencyName)
            })
            if (agencyByName) {
              setAgencyId(agencyByName.id)
            }
          }
        }
      }
    }
  }, [open, defaultAgencyId, agencies, currentUserEmail])

  const validate = () => {
    const newErrors: Record<string, string> = {}

    if (!fullName.trim()) newErrors.fullName = 'El nombre es obligatorio'
    if (!address.trim()) newErrors.address = 'La dirección es obligatoria'

    if (!telefono.trim()) {
      newErrors.telefono = 'El teléfono es obligatorio'
    } else if (!/^[0-9\-\+\s]+$/.test(telefono)) {
      newErrors.telefono = 'El teléfono solo puede contener números, guiones y espacios'
    }

    if (!email.trim()) {
      newErrors.email = 'El correo es obligatorio'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Correo electrónico inválido'
    }

    if (!password) {
      newErrors.password = 'La contraseña es obligatoria'
    } else if (password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres'
    }

    // Agencia es obligatoria
    if (!agencyId) {
      newErrors.agencyId = 'Debe seleccionar una agencia'
    }

    // Validar porcentajes contra los límites de la agencia
    const salesValue = parseFloat(shareOnSales)
    const profitsValue = parseFloat(shareOnProfits)

    if (!shareOnSales) {
      newErrors.shareOnSales = 'El porcentaje de ventas es obligatorio'
    } else if (salesValue < 0) {
      newErrors.shareOnSales = 'No puede ser negativo'
    } else if (salesValue > maxShareOnSales) {
      newErrors.shareOnSales = `No puede superar ${maxShareOnSales}% (límite de la agencia)`
    }

    if (!shareOnProfits) {
      newErrors.shareOnProfits = 'El porcentaje de participación es obligatorio'
    } else if (profitsValue < 0) {
      newErrors.shareOnProfits = 'No puede ser negativo'
    } else if (profitsValue > maxShareOnProfits) {
      newErrors.shareOnProfits = `No puede superar ${maxShareOnProfits}% (límite de la agencia)`
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    const ok = await onSave({
      fullName,
      address,
      telefono,
      email,
      password,
      agencyId,
      shareOnSales: parseFloat(shareOnSales),
      shareOnProfits: parseFloat(shareOnProfits)
    })
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // Permitir solo números, guiones, espacios y +
    if (/^[0-9\-\+\s]*$/.test(value)) {
      setTelefono(value)
      if (errors.telefono) setErrors({ ...errors, telefono: '' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar Taquilla</DialogTitle>
          <DialogDescription>Ingrese los datos de la taquilla. La contraseña se guarda de forma segura.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-2">
            <Label>Nombre completo</Label>
            <Input
              value={fullName}
              onChange={e => {
                setFullName(e.target.value)
                if (errors.fullName) setErrors({ ...errors, fullName: '' })
              }}
              placeholder="Ej: Taquilla Centro"
              className={errors.fullName ? "border-destructive" : ""}
            />
            {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Dirección</Label>
            <Input
              value={address}
              onChange={e => {
                setAddress(e.target.value)
                if (errors.address) setErrors({ ...errors, address: '' })
              }}
              placeholder="Ej: Av. Bolívar, Local 5"
              className={errors.address ? "border-destructive" : ""}
            />
            {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Teléfono</Label>
            <Input
              value={telefono}
              onChange={handlePhoneChange}
              placeholder="Ej: 0414-1234567"
              className={errors.telefono ? "border-destructive" : ""}
            />
            {errors.telefono && <p className="text-xs text-destructive">{errors.telefono}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Correo</Label>
            <Input
              type="email"
              value={email}
              onChange={e => {
                setEmail(e.target.value)
                if (errors.email) setErrors({ ...errors, email: '' })
              }}
              placeholder="correo@ejemplo.com"
              className={errors.email ? "border-destructive" : ""}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
          </div>
          <div className="grid gap-2">
            <Label>Contraseña</Label>
            <Input
              type="password"
              value={password}
              onChange={e => {
                setPassword(e.target.value)
                if (errors.password) setErrors({ ...errors, password: '' })
              }}
              placeholder="Mínimo 6 caracteres"
              className={errors.password ? "border-destructive" : ""}
            />
            {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
          </div>

          <div className="grid gap-2">
            <Label>Agencia <span className="text-destructive">*</span></Label>
            <Select
              value={agencyId || ""}
              onValueChange={(val) => {
                setAgencyId(val)
                if (errors.agencyId) setErrors({ ...errors, agencyId: '' })
              }}
            >
              <SelectTrigger className={errors.agencyId ? "border-destructive" : ""}>
                <SelectValue placeholder="Seleccione una agencia" />
              </SelectTrigger>
              <SelectContent>
                {(agencies || []).map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.agencyId && <p className="text-xs text-destructive">{errors.agencyId}</p>}
          </div>

          {/* Información de límites de la agencia */}
          {selectedAgency && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Límites de <strong>{selectedAgency.name}</strong>:
                Ventas máx. {maxShareOnSales}%, Participación máx. {maxShareOnProfits}%
              </AlertDescription>
            </Alert>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>% Ventas {selectedAgency && <span className="text-muted-foreground">(máx. {maxShareOnSales}%)</span>}</Label>
              <Input
                type="number"
                min="0"
                max={maxShareOnSales}
                step="0.01"
                value={shareOnSales}
                onChange={e => {
                  setShareOnSales(e.target.value)
                  if (errors.shareOnSales) setErrors({ ...errors, shareOnSales: '' })
                }}
                placeholder={selectedAgency ? `0 - ${maxShareOnSales}` : "Seleccione agencia"}
                disabled={!selectedAgency}
                className={errors.shareOnSales ? "border-destructive" : ""}
              />
              {errors.shareOnSales && <p className="text-xs text-destructive">{errors.shareOnSales}</p>}
            </div>
            <div className="grid gap-2">
              <Label>% Participación {selectedAgency && <span className="text-muted-foreground">(máx. {maxShareOnProfits}%)</span>}</Label>
              <Input
                type="number"
                min="0"
                max={maxShareOnProfits}
                step="0.01"
                value={shareOnProfits}
                onChange={e => {
                  setShareOnProfits(e.target.value)
                  if (errors.shareOnProfits) setErrors({ ...errors, shareOnProfits: '' })
                }}
                placeholder={selectedAgency ? `0 - ${maxShareOnProfits}` : "Seleccione agencia"}
                disabled={!selectedAgency}
                className={errors.shareOnProfits ? "border-destructive" : ""}
              />
              {errors.shareOnProfits && <p className="text-xs text-destructive">{errors.shareOnProfits}</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button type="button" onClick={handleSave} disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
