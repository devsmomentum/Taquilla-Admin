import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSettings } from '@/hooks/use-settings'
import { Gear, FloppyDisk, ArrowsClockwise, Ticket } from '@phosphor-icons/react'

export function SettingsPage() {
  const { settings, isLoading, updateSettings } = useSettings()
  const [maxCancelledTickets, setMaxCancelledTickets] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Sincronizar estado local cuando se cargan las configuraciones
  useState(() => {
    if (settings) {
      setMaxCancelledTickets(settings.maxNumberCancelledTicket.toString())
    }
  })

  // Actualizar estado local cuando cambia settings
  if (settings && maxCancelledTickets === '') {
    setMaxCancelledTickets(settings.maxNumberCancelledTicket.toString())
  }

  const handleSave = async () => {
    const value = parseInt(maxCancelledTickets, 10)
    if (isNaN(value) || value < 0) {
      return
    }

    setIsSaving(true)
    try {
      await updateSettings({
        maxNumberCancelledTicket: value,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = settings && parseInt(maxCancelledTickets, 10) !== settings.maxNumberCancelledTicket

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <ArrowsClockwise className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground">Cargando configuraciones...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Gear className="h-6 w-6" />
            Configuraciones Generales
          </h2>
          <p className="text-muted-foreground">
            Ajustes del sistema que aplican a todas las taquillas
          </p>
        </div>
      </div>

      {/* Configuración de Cancelación de Tickets */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Ticket className="h-5 w-5" />
            Cancelación de Tickets
          </CardTitle>
          <CardDescription>
            Configure el límite de tickets que una taquilla puede cancelar por día
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="max-cancelled-tickets">
              Máximo de tickets cancelados por día (por taquilla)
            </Label>
            <div className="flex gap-2 max-w-md">
              <Input
                id="max-cancelled-tickets"
                type="number"
                min="0"
                step="1"
                placeholder="Ej: 5"
                value={maxCancelledTickets}
                onChange={(e) => setMaxCancelledTickets(e.target.value)}
                className="max-w-[200px]"
              />
              <Button
                onClick={handleSave}
                disabled={!hasChanges || isSaving}
                className="gap-2"
              >
                <FloppyDisk className="h-4 w-4" />
                {isSaving ? 'Guardando...' : 'Guardar'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Este valor limita la cantidad de tickets que cada taquilla puede cancelar en un día.
              Un valor de 0 significa sin límite.
            </p>
          </div>

          {settings && (
            <div className="pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Valor actual: <span className="font-semibold text-foreground">{settings.maxNumberCancelledTicket}</span> tickets por día
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
