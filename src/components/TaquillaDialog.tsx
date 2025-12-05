import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Agency } from '@/lib/types'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  onSave: (taq: { fullName: string; address: string; telefono: string; email: string; password?: string; agencyId?: string }) => Promise<boolean>
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
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) {
      setFullName(''); setAddress(''); setTelefono(''); setEmail(''); setPassword(''); setAgencyId(undefined)
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

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return

    setSaving(true)
    const ok = await onSave({ fullName, address, telefono, email, password, agencyId })
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
            <Label>Agencia</Label>
            <Select
              value={agencyId || "none"}
              onValueChange={(val) => setAgencyId(val === "none" ? undefined : val)}
              disabled={!!agencyId}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione una agencia" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin agencia</SelectItem>
                {(agencies || []).map(agency => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
