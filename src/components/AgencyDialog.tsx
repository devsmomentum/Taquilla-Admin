import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Switch } from '@/components/ui/switch'
import { Info } from '@phosphor-icons/react'
import { useApp } from '@/contexts/AppContext'
import type { Agency, Comercializadora } from '@/lib/types'

interface Props {
    open: boolean
    onOpenChange: (v: boolean) => void
    onSave: (agency: Omit<Agency, 'id' | 'createdAt' | 'currentBalance'>) => Promise<boolean>
    comercializadoras: Comercializadora[]
    agency?: Agency
    defaultParentId?: string
}

export function AgencyDialog({ open, onOpenChange, onSave, comercializadoras, agency, defaultParentId }: Props) {
    const { subdistribuidores, currentUser } = useApp()
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [parentId, setParentId] = useState('')
    const [shareOnSales, setShareOnSales] = useState('')
    const [shareOnProfits, setShareOnProfits] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState<Record<string, string>>({})

    // Determinar si el padre es un subdistribuidor o comercializadora
    const parentEntity = useMemo(() => {
        if (!parentId) return null
        
        // Si el usuario actual es subdistribuidor, el parentId es su propio ID
        if (currentUser?.userType === 'subdistribuidor') {
            return subdistribuidores.find(s => s.id === currentUser.id)
        }
        
        // Buscar primero en subdistribuidores
        const subdistribuidor = subdistribuidores.find(s => s.id === parentId)
        if (subdistribuidor) return subdistribuidor
        
        // Si no, buscar en comercializadoras
        return comercializadoras.find(c => c.id === parentId) || null
    }, [parentId, comercializadoras, subdistribuidores, currentUser])

    const maxShareOnSales = parentEntity?.shareOnSales ?? 100
    const maxShareOnProfits = parentEntity?.shareOnProfits ?? 100

    useEffect(() => {
        if (open) {
            if (agency) {
                setName(agency.name)
                setAddress(agency.address)
                setParentId(agency.parentId || '')
                setShareOnSales((agency.shareOnSales || 0).toString())
                setShareOnProfits((agency.shareOnProfits || 0).toString())
                setIsActive(agency.isActive ?? true)
                setEmail('')
                setPassword('')
            } else {
                setName('')
                setAddress('')
                setParentId(defaultParentId || '')
                setShareOnSales('')
                setShareOnProfits('')
                setIsActive(true)
                setEmail('')
                setPassword('')
            }
            setErrors({})
        }
    }, [open, agency, defaultParentId])

    const validate = () => {
        const newErrors: Record<string, string> = {}

        if (!name.trim()) newErrors.name = 'El nombre es obligatorio'
        if (!address.trim()) newErrors.address = 'La dirección es obligatoria'
        if (!parentId) newErrors.parentId = 'Debe asignar una comercializadora'

        // Email y password solo son obligatorios al crear (no al editar)
        if (!agency) {
            if (!email.trim()) newErrors.email = 'El email es obligatorio'
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = 'Email inválido'

            if (!password.trim()) newErrors.password = 'La contraseña es obligatoria'
            else if (password.length < 6) newErrors.password = 'Mínimo 6 caracteres'
        } else {
            // Al editar, si se proporciona contraseña debe tener mínimo 6 caracteres
            if (password.trim() && password.length < 6) {
                newErrors.password = 'Mínimo 6 caracteres'
            }
        }

        // Validar porcentajes contra los límites de la comercializadora
        const salesValue = parseFloat(shareOnSales)
        const profitsValue = parseFloat(shareOnProfits)

        if (!shareOnSales) {
            newErrors.shareOnSales = 'El porcentaje de ventas es obligatorio'
        } else if (salesValue < 0) {
            newErrors.shareOnSales = 'No puede ser negativo'
        } else if (salesValue > maxShareOnSales) {
            const parentType = currentUser?.userType === 'subdistribuidor' ? 'subdistribuidor' : 'comercializadora'
            newErrors.shareOnSales = `No puede superar ${maxShareOnSales}% (límite del ${parentType})`
        }

        if (!shareOnProfits) {
            newErrors.shareOnProfits = 'El porcentaje de participación es obligatorio'
        } else if (profitsValue < 0) {
            newErrors.shareOnProfits = 'No puede ser negativo'
        } else if (profitsValue > maxShareOnProfits) {
            const parentType = currentUser?.userType === 'subdistribuidor' ? 'subdistribuidor' : 'comercializadora'
            newErrors.shareOnProfits = `No puede superar ${maxShareOnProfits}% (límite del ${parentType})`
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSave = async () => {
        if (!validate()) return

        const dataToSave = {
            name,
            address,
            parentId,
            shareOnSales: parseFloat(shareOnSales),
            shareOnProfits: parseFloat(shareOnProfits),
            isActive,
            // Al crear: incluir email y password
            ...((!agency && email && password) && {
                userEmail: email,
                userPassword: password
            }),
            // Al editar: incluir password solo si se proporcionó
            ...(agency && password.trim() && {
                password: password.trim()
            })
        }

        setSaving(true)
        const ok = await onSave(dataToSave as any)
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

                    {/* Email solo al crear */}
                    {!agency && (
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
                    )}

                    {/* Contraseña: requerida al crear, opcional al editar */}
                    <div className="grid gap-2">
                        <Label>Contraseña {!agency && '*'}</Label>
                        <Input
                            type="password"
                            value={password}
                            onChange={e => {
                                setPassword(e.target.value)
                                if (errors.password) setErrors({ ...errors, password: '' })
                            }}
                            placeholder={agency ? "Dejar vacío para mantener la actual" : "Mínimo 6 caracteres"}
                            className={errors.password ? "border-destructive" : ""}
                        />
                        {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
                        {agency && (
                            <p className="text-xs text-muted-foreground">
                                Solo se actualizará si ingresas una nueva contraseña
                            </p>
                        )}
                    </div>

                    {!defaultParentId && !agency && (
                        <div className="grid gap-2">
                            <Label>Comercializadora</Label>
                            <Select
                                value={parentId}
                                onValueChange={(val) => {
                                    setParentId(val)
                                    if (errors.parentId) setErrors({ ...errors, parentId: '' })
                                }}
                            >
                                <SelectTrigger className={errors.parentId ? "border-destructive" : ""}>
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
                            {errors.parentId && <p className="text-xs text-destructive">{errors.parentId}</p>}
                        </div>
                    )}

                    {parentEntity && (
                        <Alert>
                            <Info className="h-4 w-4" />
                            <AlertDescription>
                                Los porcentajes no pueden superar los límites del {currentUser?.userType === 'subdistribuidor' ? 'subdistribuidor' : 'padre'}: 
                                <strong> {maxShareOnSales}% en ventas</strong> y 
                                <strong> {maxShareOnProfits}% en participación</strong>
                            </AlertDescription>
                        </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>% Ventas</Label>
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
                                placeholder="Ej: 10"
                                className={errors.shareOnSales ? "border-destructive" : ""}
                            />
                            {errors.shareOnSales && <p className="text-xs text-destructive">{errors.shareOnSales}</p>}
                        </div>
                        <div className="grid gap-2">
                            <Label>% Participación</Label>
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
                                placeholder="Ej: 10"
                                className={errors.shareOnProfits ? "border-destructive" : ""}
                            />
                            {errors.shareOnProfits && <p className="text-xs text-destructive">{errors.shareOnProfits}</p>}
                        </div>
                    </div>

                    {/* Estado activo - solo al editar */}
                    {agency && (
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-0.5">
                                <Label htmlFor="is-active">Estado Activo</Label>
                                <p className="text-sm text-muted-foreground">
                                    Solo las agencias activas pueden operar
                                </p>
                            </div>
                            <Switch
                                id="is-active"
                                checked={isActive}
                                onCheckedChange={setIsActive}
                            />
                        </div>
                    )}
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
