import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Comercializadora, User } from "@/lib/types"
import { toast } from "sonner"

interface ComercializadoraDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (comercializadora: Omit<Comercializadora, 'id' | 'createdAt'>) => Promise<boolean>
    comercializadora?: Comercializadora
    currentUserId?: string
    createUser?: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<boolean>
}

export function ComercializadoraDialog({
    open,
    onOpenChange,
    onSave,
    comercializadora,
    currentUserId,
    createUser
}: ComercializadoraDialogProps) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [address, setAddress] = useState('')
    const [shareOnSales, setShareOnSales] = useState(0)
    const [shareOnProfits, setShareOnProfits] = useState(0)
    const [isDefault, setIsDefault] = useState(false)
    const [isActive, setIsActive] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        if (comercializadora) {
            setName(comercializadora.name)
            setEmail(comercializadora.email)
            setAddress(comercializadora.address || '')
            setShareOnSales(comercializadora.shareOnSales || 0)
            setShareOnProfits(comercializadora.shareOnProfits || 0)
            setIsDefault(comercializadora.isDefault)
            setIsActive(comercializadora.isActive)
            setPassword('')
        } else {
            resetForm()
        }
    }, [comercializadora, open])

    const resetForm = () => {
        setName('')
        setEmail('')
        setPassword('')
        setAddress('')
        setShareOnSales(0)
        setShareOnProfits(0)
        setIsDefault(false)
        setIsActive(true)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!name.trim()) {
            toast.error('El nombre es requerido')
            return
        }

        if (!email.trim()) {
            toast.error('El email es requerido')
            return
        }

        // Validar contraseña solo al crear
        if (!comercializadora && (!password || password.length < 6)) {
            toast.error('La contraseña debe tener al menos 6 caracteres')
            return
        }

        if (shareOnSales < 0 || shareOnSales > 100) {
            toast.error('El porcentaje de ventas debe estar entre 0 y 100')
            return
        }

        if (shareOnProfits < 0 || shareOnProfits > 100) {
            toast.error('El porcentaje de ganancias debe estar entre 0 y 100')
            return
        }

        setIsSaving(true)
        try {
            // Si es una nueva comercializadora, crear el usuario primero
            if (!comercializadora && createUser) {
                try {
                    const userCreated = await createUser({
                        name: name.trim(),
                        email: email.trim(),
                        password: password,
                        userType: 'comercializadora',
                        roleIds: [],
                        isActive: isActive,
                        createdBy: currentUserId || 'system',
                        address: address.trim() || undefined,
                        shareOnSales: shareOnSales,
                        shareOnProfits: shareOnProfits
                    })

                    if (!userCreated) {
                        toast.error('No se pudo crear el usuario. Verifica que el email no esté en uso.')
                        setIsSaving(false)
                        return
                    }

                    // La comercializadora ya fue creada como usuario
                    toast.success('Comercializadora creada exitosamente')
                    resetForm()
                    onOpenChange(false)
                    return
                } catch (error: any) {
                    console.error('Error creando usuario:', error)
                    toast.error(`Error al crear comercializadora: ${error.message || 'Error desconocido'}`)
                    setIsSaving(false)
                    return
                }
            }

            // Si estamos editando, usar onSave
            const success = await onSave({
                name: name.trim(),
                email: email.trim(),
                address: address.trim() || undefined,
                shareOnSales,
                shareOnProfits,
                isDefault,
                isActive,
                createdBy: currentUserId,
            })

            if (success) {
                resetForm()
                onOpenChange(false)
                toast.success('Comercializadora actualizada exitosamente')
            }
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {comercializadora ? 'Editar Comercializadora' : 'Nueva Comercializadora'}
                    </DialogTitle>
                    <DialogDescription>
                        {comercializadora
                            ? 'Actualiza los datos de la comercializadora'
                            : 'Crea una nueva comercializadora. Se creará un usuario con estos datos para gestionar la comercializadora.'
                        }
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nombre *</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej: Comercializadora Principal"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="comercializadora@ejemplo.com"
                            required
                            disabled={!!comercializadora}
                        />
                        {!comercializadora && (
                            <p className="text-xs text-muted-foreground">
                                Este email se usará para iniciar sesión
                            </p>
                        )}
                    </div>

                    {/* Contraseña solo al crear */}
                    {!comercializadora && (
                        <div className="space-y-2">
                            <Label htmlFor="password">Contraseña *</Label>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                required
                                minLength={6}
                            />
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label htmlFor="address">Dirección</Label>
                        <Input
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Dirección de la comercializadora"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="shareOnSales">Participación en Ventas (%)</Label>
                            <Input
                                id="shareOnSales"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={shareOnSales}
                                onChange={(e) => setShareOnSales(parseFloat(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">
                                % sobre el total vendido
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shareOnProfits">Participación en Ganancias (%)</Label>
                            <Input
                                id="shareOnProfits"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={shareOnProfits}
                                onChange={(e) => setShareOnProfits(parseFloat(e.target.value) || 0)}
                            />
                            <p className="text-xs text-muted-foreground">
                                % sobre la ganancia neta
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="is-active">Estado Activo</Label>
                            <p className="text-sm text-muted-foreground">
                                Solo las comercializadoras activas pueden operar
                            </p>
                        </div>
                        <Switch
                            id="is-active"
                            checked={isActive}
                            onCheckedChange={setIsActive}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Guardando...' : comercializadora ? 'Actualizar' : 'Crear'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
