import { useState, useCallback } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { formatCurrency } from '@/lib/pot-utils'
import { supabase } from '@/lib/supabase'
import { startOfDay, endOfDay, startOfWeek, startOfMonth } from 'date-fns'
import {
  CaretRight,
  CaretDown,
  User,
  Buildings,
  Storefront,
  UserCircle,
  Spinner
} from '@phosphor-icons/react'

// Tipos para las estadísticas
interface EntityStats {
  id: string
  name: string
  type: 'admin' | 'comercializadora' | 'agencia' | 'taquilla'
  sales: number
  prizes: number
  commission: number
  commissionPercent: number
  balance: number
  profit?: number
  profitPercent?: number
  parentId?: string
  hasChildren: boolean
}

interface HierarchicalStatsTableProps {
  rootType: 'admin' | 'comercializadora' | 'agencia' | 'taquilla'
  rootEntities: EntityStats[]
  dateFrom: Date
  dateTo: Date
  allUsers: any[] // Todos los usuarios del sistema
  isLoading?: boolean
}

// Componente de fila expandible
interface ExpandableRowProps {
  entity: EntityStats
  level: number
  dateFrom: Date
  dateTo: Date
  allUsers: any[]
}

function ExpandableRow({ entity, level, dateFrom, dateTo, allUsers }: ExpandableRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [children, setChildren] = useState<EntityStats[]>([])
  const [isLoadingChildren, setIsLoadingChildren] = useState(false)

  // Determinar el tipo de hijos según el tipo actual
  const getChildType = (parentType: string): 'comercializadora' | 'agencia' | 'taquilla' | null => {
    switch (parentType) {
      case 'admin': return 'comercializadora'
      case 'comercializadora': return 'agencia'
      case 'agencia': return 'taquilla'
      default: return null
    }
  }

  // Cargar estadísticas de los hijos
  const loadChildren = useCallback(async () => {
    const childType = getChildType(entity.type)
    if (!childType) return

    setIsLoadingChildren(true)

    try {
      // Filtrar usuarios hijos según el tipo
      const childUsers = allUsers.filter(u => {
        // Solo usar parentId para determinar la propiedad (no createdBy)
        return u.userType === childType && u.parentId === entity.id
      })

      if (childUsers.length === 0) {
        setChildren([])
        setIsLoadingChildren(false)
        return
      }

      // Obtener IDs de taquillas según el nivel
      let taquillaIds: string[] = []

      if (childType === 'taquilla') {
        taquillaIds = childUsers.map(u => u.id)
      } else if (childType === 'agencia') {
        // Obtener taquillas de estas agencias
        const agencyIds = childUsers.map(u => u.id)
        const taquillas = allUsers.filter(u => u.userType === 'taquilla' && agencyIds.includes(u.parentId))
        taquillaIds = taquillas.map(t => t.id)
      } else if (childType === 'comercializadora') {
        // Obtener agencias de estas comercializadoras, luego taquillas de esas agencias
        const comIds = childUsers.map(u => u.id)
        const agencies = allUsers.filter(u => u.userType === 'agencia' && comIds.includes(u.parentId))
        const agencyIds = agencies.map(a => a.id)
        const taquillas = allUsers.filter(u => u.userType === 'taquilla' && agencyIds.includes(u.parentId))
        taquillaIds = taquillas.map(t => t.id)
      }

      // Preparar fechas para la consulta
      const queryStart = startOfDay(dateFrom).toISOString()
      const queryEnd = endOfDay(dateTo).toISOString()

      // Consultar ventas (bets)
      let salesByUser = new Map<string, number>()
      if (taquillaIds.length > 0) {
        const { data: salesData } = await supabase
          .from('bets')
          .select('user_id, amount')
          .in('user_id', taquillaIds)
          .gte('created_at', queryStart)
          .lte('created_at', queryEnd)
          .neq('status', 'cancelled')

        ;(salesData || []).forEach(bet => {
          const current = salesByUser.get(bet.user_id) || 0
          salesByUser.set(bet.user_id, current + Number(bet.amount || 0))
        })
      }

      // Consultar premios (bets_item_lottery_clasic)
      let prizesByUser = new Map<string, number>()
      if (taquillaIds.length > 0) {
        const { data: prizesData } = await supabase
          .from('bets_item_lottery_clasic')
          .select('user_id, potential_bet_amount')
          .in('user_id', taquillaIds)
          .in('status', ['winner', 'paid'])
          .gte('created_at', queryStart)
          .lte('created_at', queryEnd)

        ;(prizesData || []).forEach(item => {
          const current = prizesByUser.get(item.user_id) || 0
          prizesByUser.set(item.user_id, current + Number(item.potential_bet_amount || 0))
        })
      }

      // Calcular estadísticas por hijo
      const childStats: EntityStats[] = childUsers.map(child => {
        let sales = 0
        let prizes = 0

        if (childType === 'taquilla') {
          sales = salesByUser.get(child.id) || 0
          prizes = prizesByUser.get(child.id) || 0
        } else if (childType === 'agencia') {
          // Sumar ventas/premios de las taquillas de esta agencia
          const agencyTaquillas = allUsers.filter(u => u.userType === 'taquilla' && u.parentId === child.id)
          agencyTaquillas.forEach(t => {
            sales += salesByUser.get(t.id) || 0
            prizes += prizesByUser.get(t.id) || 0
          })
        } else if (childType === 'comercializadora') {
          // Sumar ventas/premios de las taquillas de las agencias de esta comercializadora
          const comAgencies = allUsers.filter(u => u.userType === 'agencia' && u.parentId === child.id)
          comAgencies.forEach(agency => {
            const agencyTaquillas = allUsers.filter(u => u.userType === 'taquilla' && u.parentId === agency.id)
            agencyTaquillas.forEach(t => {
              sales += salesByUser.get(t.id) || 0
              prizes += prizesByUser.get(t.id) || 0
            })
          })
        }

        const commissionPercent = child.shareOnSales || 0
        const commission = sales * (commissionPercent / 100)
        const balance = sales - prizes - commission

        // Calcular ganancia solo para comercializadoras
        let profit = 0
        let profitPercent = 0
        if (childType === 'comercializadora') {
          profitPercent = child.shareOnProfits || 0
          profit = balance > 0 ? balance * (profitPercent / 100) : 0
        }

        // Determinar si tiene hijos
        let hasChildren = false
        if (childType === 'comercializadora') {
          hasChildren = allUsers.some(u => u.userType === 'agencia' && u.parentId === child.id)
        } else if (childType === 'agencia') {
          hasChildren = allUsers.some(u => u.userType === 'taquilla' && u.parentId === child.id)
        }

        return {
          id: child.id,
          name: child.name,
          type: childType,
          sales,
          prizes,
          commission,
          commissionPercent,
          balance,
          profit: childType === 'comercializadora' ? profit : undefined,
          profitPercent: childType === 'comercializadora' ? profitPercent : undefined,
          parentId: child.parentId,
          hasChildren
        }
      })

      // Ordenar por ventas descendente
      childStats.sort((a, b) => b.sales - a.sales)

      setChildren(childStats)
    } catch (error) {
      console.error('Error loading children stats:', error)
    } finally {
      setIsLoadingChildren(false)
    }
  }, [entity, allUsers, dateFrom, dateTo])

  // Manejar expansión
  const handleToggle = async () => {
    if (!entity.hasChildren) return

    if (!isExpanded && children.length === 0) {
      await loadChildren()
    }
    setIsExpanded(!isExpanded)
  }

  // Icono según el tipo
  const getIcon = () => {
    switch (entity.type) {
      case 'admin': return <UserCircle className="h-4 w-4 text-white" weight="fill" />
      case 'comercializadora': return <Buildings className="h-4 w-4 text-white" weight="fill" />
      case 'agencia': return <Storefront className="h-4 w-4 text-white" weight="fill" />
      case 'taquilla': return <User className="h-4 w-4 text-white" weight="fill" />
    }
  }

  // Color del icono según el tipo
  const getIconBg = () => {
    switch (entity.type) {
      case 'admin': return 'from-slate-500 to-slate-600'
      case 'comercializadora': return 'from-indigo-500 to-indigo-600'
      case 'agencia': return 'from-cyan-500 to-cyan-600'
      case 'taquilla': return 'from-violet-500 to-violet-600'
    }
  }

  // Etiqueta del tipo
  const getTypeLabel = () => {
    switch (entity.type) {
      case 'admin': return 'Admin'
      case 'comercializadora': return 'Com.'
      case 'agencia': return 'Agencia'
      case 'taquilla': return 'Taquilla'
    }
  }

  return (
    <>
      <TableRow
        className={`${entity.hasChildren ? 'cursor-pointer hover:bg-muted/50' : ''} ${level > 0 ? 'bg-muted/20' : ''} ${isLoadingChildren ? 'bg-blue-50 animate-pulse' : ''}`}
        onClick={entity.hasChildren ? handleToggle : undefined}
      >
        <TableCell>
          <div className="flex items-center gap-2" style={{ paddingLeft: `${level * 24}px` }}>
            {entity.hasChildren ? (
              <Button variant="ghost" size="icon" className={`h-6 w-6 p-0 ${isLoadingChildren ? 'text-blue-600' : ''}`}>
                {isLoadingChildren ? (
                  <Spinner className="h-4 w-4 animate-spin text-blue-600" weight="bold" />
                ) : isExpanded ? (
                  <CaretDown className="h-4 w-4" />
                ) : (
                  <CaretRight className="h-4 w-4" />
                )}
              </Button>
            ) : (
              <div className="w-6" />
            )}
            <div className={`h-7 w-7 rounded-lg bg-gradient-to-br ${getIconBg()} flex items-center justify-center`}>
              {isLoadingChildren ? (
                <Spinner className="h-4 w-4 animate-spin text-white" weight="bold" />
              ) : (
                getIcon()
              )}
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{entity.name}</span>
                {isLoadingChildren && (
                  <span className="text-xs text-blue-600 animate-pulse">Cargando...</span>
                )}
              </div>
              <Badge variant="outline" className="text-[10px] w-fit">
                {getTypeLabel()}
              </Badge>
            </div>
          </div>
        </TableCell>
        <TableCell className="text-right font-semibold text-blue-600">
          {formatCurrency(entity.sales)}
        </TableCell>
        <TableCell className="text-right font-semibold text-red-600">
          {formatCurrency(entity.prizes)}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex flex-col items-end">
            <span className="font-medium text-amber-600">{formatCurrency(entity.commission)}</span>
            <span className="text-xs text-muted-foreground">({entity.commissionPercent}%)</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <span className={`font-bold ${entity.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatCurrency(entity.balance)}
          </span>
        </TableCell>
        {entity.type === 'comercializadora' && (
          <TableCell className="text-right">
            <div className="flex flex-col items-end">
              <span className="font-bold text-purple-600">{formatCurrency(entity.profit || 0)}</span>
              <span className="text-xs text-muted-foreground">({entity.profitPercent || 0}%)</span>
            </div>
          </TableCell>
        )}
      </TableRow>

      {/* Filas hijas */}
      {isExpanded && children.map(child => (
        <ExpandableRow
          key={child.id}
          entity={child}
          level={level + 1}
          dateFrom={dateFrom}
          dateTo={dateTo}
          allUsers={allUsers}
        />
      ))}
    </>
  )
}

export function HierarchicalStatsTable({
  rootType,
  rootEntities,
  dateFrom,
  dateTo,
  allUsers,
  isLoading
}: HierarchicalStatsTableProps) {
  // Calcular totales
  const totals = rootEntities.reduce((acc, entity) => ({
    sales: acc.sales + entity.sales,
    prizes: acc.prizes + entity.prizes,
    commission: acc.commission + entity.commission,
    balance: acc.balance + entity.balance,
    profit: acc.profit + (entity.profit || 0)
  }), { sales: 0, prizes: 0, commission: 0, balance: 0, profit: 0 })

  // Determinar si mostrar columna de ganancia (solo para comercializadoras)
  const showProfitColumn = rootType === 'admin' || rootType === 'comercializadora'

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    )
  }

  if (rootEntities.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Buildings className="h-10 w-10 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No hay datos para mostrar</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[250px]">Entidad</TableHead>
            <TableHead className="text-right">Ventas</TableHead>
            <TableHead className="text-right">Premios</TableHead>
            <TableHead className="text-right">Comisión (%)</TableHead>
            <TableHead className="text-right">Balance</TableHead>
            {showProfitColumn && <TableHead className="text-right">Ganancia (%)</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rootEntities.map(entity => (
            <ExpandableRow
              key={entity.id}
              entity={entity}
              level={0}
              dateFrom={dateFrom}
              dateTo={dateTo}
              allUsers={allUsers}
            />
          ))}

          {/* Fila de totales */}
          <TableRow className="bg-muted/50 font-bold border-t-2">
            <TableCell>
              <span className="font-bold pl-8">TOTALES</span>
            </TableCell>
            <TableCell className="text-right text-blue-600 font-bold">
              {formatCurrency(totals.sales)}
            </TableCell>
            <TableCell className="text-right text-red-600 font-bold">
              {formatCurrency(totals.prizes)}
            </TableCell>
            <TableCell className="text-right text-amber-600 font-bold">
              {formatCurrency(totals.commission)}
            </TableCell>
            <TableCell className={`text-right font-bold ${totals.balance >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(totals.balance)}
            </TableCell>
            {showProfitColumn && (
              <TableCell className="text-right text-purple-600 font-bold">
                {formatCurrency(totals.profit)}
              </TableCell>
            )}
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
