import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Agency, Comercializadora } from '@/lib/types'

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    onSave: (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance' | 'isActive'>) => Promise<boolean>
    comercializadoras: Comercializadora[]
    agency?: Agency
    defaultCommercializerId?: string
}

export function AgencyDialog({ open, onOpenChange, onSave, comercializadoras, agency, defaultCommercializerId }: Props) {
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [logo, setLogo] = useState('')
    const [commercializerId, setCommercializerId] = useState('')
    const [shareOnSales, setShareOnSales] = useState('')
    const [shareOnProfits, setShareOnProfits] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    useEffect(() => {
        if (open) {
            console.log('🔍 AgencyDialog opened, defaultCommercializerId:', defaultCommercializerId)
            if (agency) {
                setName(agency.name)
                setAddress(agency.address)
                setLogo(agency.logo || '')
                setCommercializerId(agency.commercializerId)
                setShareOnSales((agency.shareOnSales || 0).toString())
                setShareOnProfits((agency.shareOnProfits || 0).toString())
                setEmail('')
                setPassword('')
            } else {
                setName('')
                setAddress('')
                setLogo('')
                console.log('⚙️ Setting commercializerId to:', defaultCommercializerId || '')
                setCommercializerId(defaultCommercializerId || '')
                setShareOnSales('')
                setShareOnProfits('')
                setEmail('')
                setPassword('')
                console.log('✅ commercializerId state set, value should be:', defaultCommercializerId)
            }
            setErrors({})
        }
    }, [open, agency, defaultCommercializerId])

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!name.trim()) newErrors.name = 'El nombre es obligatorio'
        if (!address.trim()) newErrors.address = 'La dirección es obligatoria'
        if (!commercializerId) newErrors.commercializerId = 'Debe asignar un comercializador'

        // Email y password solo son obligatorios al crear (no al editar)
        if (!agency) {
            if (!email.trim()) newErrors.email = 'El email es obligatorio'
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido'

            if (!password.trim()) newErrors.password = 'La contraseña es obligatoria'
            else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres'
        }

        if (!shareOnSales) {
            newErrors.shareOnSales = 'El porcentaje de ventas es obligatorio'
        } else if (parseFloat(shareOnSales) < 0 || parseFloat(shareOnSales) > 100) {
            newErrors.shareOnSales = 'Debe estar entre 0 y 100'
        }

        if (!shareOnProfits) {
            newErrors.shareOnProfits = 'El porcentaje de ganancias es obligatorio'
        } else if (parseFloat(shareOnProfits) < 0 || parseFloat(shareOnProfits) > 100) {
            newErrors.shareOnProfits = 'Debe estar entre 0 y 100'
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return

        setSaving(true)
        const ok = await onSave({
            name,
            address,
            logo: logo || undefined,
            commercializerId,
            shareOnSales: parseFloat(shareOnSales),
            shareOnProfits: parseFloat(shareOnProfits),
            // Solo enviar email y password al crear (no al editar)
            ...((!agency && email && password) && {
                userEmail: email,
                userPassword: password
            })
        } as any)
        setSaving(false)
        if (ok) onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{agency ? 'Editar Agencia' : 'Nueva Agencia'}</DialogTitle>
                    <DialogDescription>
                        Configure los datos financieros y operativos de la agencia.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Nombre de la Agencia</Label>
                        <Input
                            value={name}
                            onChange={e => {
                                setName(e.target.value)
                                if (errors.name) setErrors({ ...errors, name: '' })
                            }}
                            placeholder="Ej: Grupo Norte"
                            className={errors.name ? "border-destructive" : ""}
                        />
                        {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label>Dirección</Label>
                        <Input
                            value={address}
                            onChange={e => {
                                setAddress(e.target.value)
                                if (errors.address) setErrors({ ...errors, address: '' })
                            }}
                            placeholder="Ej: Av. Principal, Edif. Azul"
                            className={errors.address ? "border-destructive" : ""}
                        />
                        {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
                    </div>

                    <div className="grid gap-2">
                        <Label>Logo (URL Opcional)</Label>
                        <Input
                            value={logo}
                            onChange={e => setLogo(e.target.value)}
                            placeholder="https://ejemplo.com/logo.png"
                        />
                    </div>

                    {/* Email y Password solo al crear */}
                    {!agency && (
                        <>
                            <div className="grid gap-2">
                                <Label>Email del Usuario</Label>
                                <Input
                                    type="email"
                                    value={email}
                                    onChange={e => {
                                        setEmail(e.target.value)
                                        if (errors.email) setErrors({ ...errors, email: '' })
                                    }}
                                    placeholder="agencia@ejemplo.com"
                                    className={errors.email ? "border-destructive" : ""}
                                />
                                {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
                                <p className="text-xs text-muted-foreground">
                                    Se creará un usuario con este email para acceder al sistema
                                </p>
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
                        </>
                    )}

                    <div className="grid gap-2">
                        <Label>Comercializador Responsable</Label>
                        <Select
                            value={commercializerId}
                            disabled={!!defaultCommercializerId}
                            onValueChange={(val) => {
                                setCommercializerId(val)
                                if (errors.commercializerId) setErrors({ ...errors, commercializerId: '' })
                            }}
                        >
                            <SelectTrigger className={errors.commercializerId ? "border-destructive" : ""}>
                                <SelectValue placeholder="Seleccione una comercializadora" />
                            </SelectTrigger>
                            <SelectContent>
                                {(comercializadoras || []).map(comercializadora => (
                                    <SelectItem key={comercializadora.id} value={comercializadora.id}>
                                        {comercializadora.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.commercializerId && <p className="text-xs text-destructive">{errors.commercializerId}</p>}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>% Ventas</Label>
                            <Input
                                type="number"
                                value={shareOnSales}
                                onChange={e => {
                                    setShareOnSales(e.target.value)
                                    if (errors.shareOnSales) setErrors({ ...errors, shareOnSales: '' })
                                }}
                                placeholder="10"
                                className={errors.shareOnSales ? "border-destructive" : ""}
                            />
                            {errors.shareOnSales && <p className="text-xs text-destructive">{errors.shareOnSales}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>% Ganancias</Label>
                            <Input
                                type="number"
                                value={shareOnProfits}
                                onChange={e => {
                                    setShareOnProfits(e.target.value)
                                    if (errors.shareOnProfits) setErrors({ ...errors, shareOnProfits: '' })
                                }}
                                placeholder="50"
                                className={errors.shareOnProfits ? "border-destructive" : ""}
                            />
                            {errors.shareOnProfits && <p className="text-xs text-destructive">{errors.shareOnProfits}</p>}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Guardando...' : 'Guardar'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
