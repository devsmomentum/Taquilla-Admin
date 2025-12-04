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
    const [address, setAddress] = useState('')
    const [shareOnSales, setShareOnSales] = useState(0)
    const [shareOnProfits, setShareOnProfits] = useState(0)
    const [isDefault, setIsDefault] = useState(false)
    const [isActive, setIsActive] = useState(true)
    const [isSaving, setIsSaving] = useState(false)

    // Campos para el usuario
    const [userName, setUserName] = useState('')
    const [userEmail, setUserEmail] = useState('')
    const [userPassword, setUserPassword] = useState('')

    useEffect(() => {
        if (comercializadora) {
            setName(comercializadora.name)
            setEmail(comercializadora.email)
            setAddress(comercializadora.address || '')
            setShareOnSales(comercializadora.shareOnSales || 0)
            setShareOnProfits(comercializadora.shareOnProfits || 0)
            setIsDefault(comercializadora.isDefault)
            setIsActive(comercializadora.isActive)
        } else {
            resetForm()
        }
    }, [comercializadora, open])

    const resetForm = () => {
        setName('')
        setEmail('')
        setAddress('')
        setShareOnSales(0)
        setShareOnProfits(0)
        setIsDefault(false)
        setIsActive(true)
        setUserName('')
        setUserEmail('')
        setUserPassword('')
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

        if (shareOnSales < 0 || shareOnSales > 100) {
            toast.error('El porcentaje de ventas debe estar entre 0 y 100')
            return
        }

        if (shareOnProfits < 0 || shareOnProfits > 100) {
            toast.error('El porcentaje de ganancias debe estar entre 0 y 100')
            return
        }

        // Validar campos de usuario solo si es una nueva comercializadora
        if (!comercializadora) {
            if (!userName.trim()) {
                toast.error('El nombre del usuario es requerido')
                return
            }
            if (!userEmail.trim()) {
                toast.error('El email del usuario es requerido')
                return
            }
            if (!userPassword || userPassword.length < 6) {
                toast.error('La contraseña debe tener al menos 6 caracteres')
                return
            }
        }

        setIsSaving(true)
        try {
            let userId = currentUserId

            // Si es una nueva comercializadora, crear el usuario primero
            if (!comercializadora && createUser) {
                const userCreated = await createUser({
                    name: userName.trim(),
                    email: userEmail.trim(),
                    password: userPassword,
                    roleIds: ['comercializadora'], // Asignar rol de comercializadora
                    isActive: true,
                    createdBy: currentUserId || 'system'
                })

                if (!userCreated) {
                    toast.error('No se pudo crear el usuario')
                    return
                }

                // Usar el email del usuario como identificador temporal
                // El hook useSupabaseComercializadoras auto-vinculará usando createdBy
                userId = userEmail.trim()
            }

            const success = await onSave({
                name: name.trim(),
                email: email.trim(),
                address: address.trim() || undefined,
                shareOnSales,
                shareOnProfits,
                isDefault,
                isActive,
                createdBy: userId || currentUserId,
            })

            if (success) {
                resetForm()
                onOpenChange(false)
                if (!comercializadora) {
                    toast.success('Comercializadora y usuario creados exitosamente')
                }
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
                            : 'Crea una nueva comercializadora para gestionar agencias'
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
                        />
                    </div>

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

                    {/* Campos de usuario - Solo al crear nueva comercializadora */}
                    {!comercializadora && (
                        <>
                            <div className="border-t pt-4 mt-4">
                                <h3 className="text-sm font-medium mb-3">Datos del Usuario Responsable</h3>
                                <p className="text-xs text-muted-foreground mb-4">
                                    Se creará un usuario con acceso para gestionar esta comercializadora
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="userName">Nombre del Usuario *</Label>
                                <Input
                                    id="userName"
                                    value={userName}
                                    onChange={(e) => setUserName(e.target.value)}
                                    placeholder="Ej: Juan Pérez"
                                    required={!comercializadora}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="userEmail">Email del Usuario *</Label>
                                <Input
                                    id="userEmail"
                                    type="email"
                                    value={userEmail}
                                    onChange={(e) => setUserEmail(e.target.value)}
                                    placeholder="usuario@ejemplo.com"
                                    required={!comercializadora}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Este email se usará para iniciar sesión
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="userPassword">Contraseña *</Label>
                                <Input
                                    id="userPassword"
                                    type="password"
                                    value={userPassword}
                                    onChange={(e) => setUserPassword(e.target.value)}
                                    placeholder="Mínimo 6 caracteres"
                                    required={!comercializadora}
                                    minLength={6}
                                />
                            </div>
                        </>
                    )}

                    <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="space-y-0.5">
                            <Label htmlFor="is-default">Comercializadora por Defecto</Label>
                            <p className="text-sm text-muted-foreground">
                                Las taquillas sin código se asignarán a esta comercializadora
                            </p>
                        </div>
                        <Switch
                            id="is-default"
                            checked={isDefault}
                            onCheckedChange={setIsDefault}
                        />
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
