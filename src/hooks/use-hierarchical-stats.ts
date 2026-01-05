import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '@/lib/supabase'
import { startOfDay, endOfDay } from 'date-fns'

interface EntityStats {
  id: string
  name: string
  type: 'admin' | 'comercializadora' | 'subdistribuidor' | 'agencia' | 'taquilla'
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

interface UseHierarchicalStatsOptions {
  currentUser: {
    id: string
    userType?: string
    all_permissions: string[]
  } | null
  allUsers: any[]
  dateFrom: Date
  dateTo: Date
}

export function useHierarchicalStats(options: UseHierarchicalStatsOptions) {
  const { currentUser, allUsers, dateFrom, dateTo } = options

  const [rootEntities, setRootEntities] = useState<EntityStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determinar el tipo de usuario actual y qué entidades raíz mostrar
  const rootType = useMemo((): 'admin' | 'comercializadora' | 'subdistribuidor' | 'agencia' | 'taquilla' => {
    if (!currentUser) return 'admin'

    const isSuperAdmin = currentUser.all_permissions?.includes('*')
    const userType = currentUser.userType

    if (userType === 'admin' || !userType) {
      return isSuperAdmin ? 'admin' : 'comercializadora'
    }
    if (userType === 'comercializadora') return 'subdistribuidor'
    if (userType === 'subdistribuidor') return 'agencia'
    if (userType === 'agencia') return 'taquilla'

    return 'taquilla'
  }, [currentUser])

  // Cargar estadísticas de las entidades raíz
  const loadStats = useCallback(async () => {
    if (!currentUser || allUsers.length === 0) {
      setRootEntities([])
      return
    }

    setLoading(true)
    setError(null)

    try {
      const queryStart = startOfDay(dateFrom).toISOString()
      const queryEnd = endOfDay(dateTo).toISOString()

      const isSuperAdmin = currentUser.all_permissions?.includes('*')
      const userType = currentUser.userType

      let entitiesToShow: any[] = []

      // Determinar qué entidades mostrar según el tipo de usuario
      if (userType === 'admin' || !userType) {
        if (isSuperAdmin) {
          // Super Admin: mostrar todos los admins (excepto él mismo)
          entitiesToShow = allUsers.filter(u =>
            u.userType === 'admin' && u.id !== currentUser.id
          )
        } else {
          // Admin con roles: mostrar comercializadoras asignadas (parentId)
          // Nota: No usar createdBy ya que solo indica quién creó el registro, no el propietario actual
          entitiesToShow = allUsers.filter(u =>
            u.userType === 'comercializadora' &&
            u.parentId === currentUser.id
          )
        }
      } else if (userType === 'comercializadora') {
        // Comercializadora: mostrar sus subdistribuidores y agencias directas
        const subdistribuidores = allUsers.filter(u =>
          u.userType === 'subdistribuidor' && u.parentId === currentUser.id
        )
        
        const directAgencies = allUsers.filter(u =>
          u.userType === 'agencia' && u.parentId === currentUser.id
        )
        
        // Combinar subdistribuidores y agencias directas
        entitiesToShow = [...subdistribuidores, ...directAgencies]
      } else if (userType === 'subdistribuidor') {
        // Subdistribuidor: mostrar sus agencias
        entitiesToShow = allUsers.filter(u =>
          u.userType === 'agencia' && u.parentId === currentUser.id
        )
      } else if (userType === 'agencia') {
        // Agencia: mostrar sus taquillas
        entitiesToShow = allUsers.filter(u =>
          u.userType === 'taquilla' && u.parentId === currentUser.id
        )
      }

      if (entitiesToShow.length === 0) {
        setRootEntities([])
        setLoading(false)
        return
      }

      // Obtener IDs de taquillas para consultar ventas/premios
      let taquillaIds: string[] = []

      if (rootType === 'taquilla') {
        taquillaIds = entitiesToShow.map(e => e.id)
      } else if (rootType === 'agencia') {
        // Obtener taquillas de estas agencias
        const agencyIds = entitiesToShow.map(e => e.id)
        const taquillas = allUsers.filter(u =>
          u.userType === 'taquilla' && agencyIds.includes(u.parentId)
        )
        taquillaIds = taquillas.map(t => t.id)
      } else if (rootType === 'subdistribuidor') {
        // Obtener taquillas de subdistribuidores y agencias directas
        entitiesToShow.forEach(entity => {
          if (entity.userType === 'subdistribuidor') {
            // Para subdistribuidor, obtener sus agencias y luego las taquillas
            const subAgencies = allUsers.filter(u =>
              u.userType === 'agencia' && u.parentId === entity.id
            )
            subAgencies.forEach(agency => {
              const agencyTaquillas = allUsers.filter(u =>
                u.userType === 'taquilla' && u.parentId === agency.id
              )
              taquillaIds.push(...agencyTaquillas.map(t => t.id))
            })
          } else if (entity.userType === 'agencia') {
            // Para agencia directa, obtener sus taquillas
            const agencyTaquillas = allUsers.filter(u =>
              u.userType === 'taquilla' && u.parentId === entity.id
            )
            taquillaIds.push(...agencyTaquillas.map(t => t.id))
          }
        })
      } else if (rootType === 'comercializadora') {
        // Obtener taquillas de las agencias de estas comercializadoras
        // Ahora debemos considerar subdistribuidores también
        const comIds = entitiesToShow.map(e => e.id)
        
        // Primero obtenemos las agencias directas
        const directAgencies = allUsers.filter(u =>
          u.userType === 'agencia' && comIds.includes(u.parentId)
        )
        
        // Luego obtenemos los subdistribuidores
        const subdistribuidores = allUsers.filter(u =>
          u.userType === 'subdistribuidor' && comIds.includes(u.parentId)
        )
        const subIds = subdistribuidores.map(s => s.id)
        
        // Obtenemos las agencias de los subdistribuidores
        const subdistAgencies = allUsers.filter(u =>
          u.userType === 'agencia' && subIds.includes(u.parentId)
        )
        
        // Combinamos todas las agencias
        const allAgencies = [...directAgencies, ...subdistAgencies]
        const agencyIds = allAgencies.map(a => a.id)
        
        // Finalmente obtenemos todas las taquillas
        const taquillas = allUsers.filter(u =>
          u.userType === 'taquilla' && agencyIds.includes(u.parentId)
        )
        taquillaIds = taquillas.map(t => t.id)
      } else if (rootType === 'admin') {
        // Para cada admin, obtener todas las taquillas de su jerarquía
        // Primero, todas las comercializadoras
        const allComs = allUsers.filter(u => u.userType === 'comercializadora')
        const allAgencies = allUsers.filter(u => u.userType === 'agencia')
        const allTaquillas = allUsers.filter(u => u.userType === 'taquilla')
        taquillaIds = allTaquillas.map(t => t.id)
      }

      // Consultar ventas (bets)
      let salesByTaquilla = new Map<string, number>()
      if (taquillaIds.length > 0) {
        const { data: salesData } = await supabase
          .from('bets')
          .select('user_id, amount')
          .in('user_id', taquillaIds)
          .gte('created_at', queryStart)
          .lte('created_at', queryEnd)
          .neq('status', 'cancelled')

        ;(salesData || []).forEach(bet => {
          const current = salesByTaquilla.get(bet.user_id) || 0
          salesByTaquilla.set(bet.user_id, current + Number(bet.amount || 0))
        })
      }

      // Consultar premios (bets_item_lottery_clasic)
      let prizesByTaquilla = new Map<string, number>()
      if (taquillaIds.length > 0) {
        const { data: prizesData } = await supabase
          .from('bets_item_lottery_clasic')
          .select('user_id, potential_bet_amount')
          .in('user_id', taquillaIds)
          .in('status', ['winner', 'paid'])
          .gte('created_at', queryStart)
          .lte('created_at', queryEnd)

        ;(prizesData || []).forEach(item => {
          const current = prizesByTaquilla.get(item.user_id) || 0
          prizesByTaquilla.set(item.user_id, current + Number(item.potential_bet_amount || 0))
        })
      }

      // Calcular estadísticas por entidad
      const stats: EntityStats[] = entitiesToShow.map(entity => {
        let sales = 0
        let prizes = 0

        if (rootType === 'taquilla') {
          sales = salesByTaquilla.get(entity.id) || 0
          prizes = prizesByTaquilla.get(entity.id) || 0
        } else if (rootType === 'agencia') {
          // Sumar ventas/premios de las taquillas de esta agencia
          const agencyTaquillas = allUsers.filter(u =>
            u.userType === 'taquilla' && u.parentId === entity.id
          )
          agencyTaquillas.forEach(t => {
            sales += salesByTaquilla.get(t.id) || 0
            prizes += prizesByTaquilla.get(t.id) || 0
          })
        } else if (rootType === 'subdistribuidor') {
          // Para subdistribuidor/agencia mixto
          if (entity.userType === 'subdistribuidor') {
            // Sumar ventas/premios de las taquillas de las agencias de este subdistribuidor
            const subAgencies = allUsers.filter(u =>
              u.userType === 'agencia' && u.parentId === entity.id
            )
            subAgencies.forEach(agency => {
              const agencyTaquillas = allUsers.filter(u =>
                u.userType === 'taquilla' && u.parentId === agency.id
              )
              agencyTaquillas.forEach(t => {
                sales += salesByTaquilla.get(t.id) || 0
                prizes += prizesByTaquilla.get(t.id) || 0
              })
            })
          } else if (entity.userType === 'agencia') {
            // Para agencia directa
            const agencyTaquillas = allUsers.filter(u =>
              u.userType === 'taquilla' && u.parentId === entity.id
            )
            agencyTaquillas.forEach(t => {
              sales += salesByTaquilla.get(t.id) || 0
              prizes += prizesByTaquilla.get(t.id) || 0
            })
          }
        } else if (rootType === 'comercializadora') {
          // Sumar ventas/premios de las taquillas de las agencias de esta comercializadora
          // Incluye tanto agencias directas como las que están bajo subdistribuidores
          
          // Agencias directas
          const directAgencies = allUsers.filter(u =>
            u.userType === 'agencia' && u.parentId === entity.id
          )
          directAgencies.forEach(agency => {
            const agencyTaquillas = allUsers.filter(u =>
              u.userType === 'taquilla' && u.parentId === agency.id
            )
            agencyTaquillas.forEach(t => {
              sales += salesByTaquilla.get(t.id) || 0
              prizes += prizesByTaquilla.get(t.id) || 0
            })
          })
          
          // Agencias bajo subdistribuidores
          const subdistribuidores = allUsers.filter(u =>
            u.userType === 'subdistribuidor' && u.parentId === entity.id
          )
          subdistribuidores.forEach(sub => {
            const subAgencies = allUsers.filter(u =>
              u.userType === 'agencia' && u.parentId === sub.id
            )
            subAgencies.forEach(agency => {
              const agencyTaquillas = allUsers.filter(u =>
                u.userType === 'taquilla' && u.parentId === agency.id
              )
              agencyTaquillas.forEach(t => {
                sales += salesByTaquilla.get(t.id) || 0
                prizes += prizesByTaquilla.get(t.id) || 0
              })
            })
          })
        } else if (rootType === 'admin') {
          // Para admins, sumar todo de sus comercializadoras (solo por parentId)
          const adminComs = allUsers.filter(u =>
            u.userType === 'comercializadora' &&
            u.parentId === entity.id
          )
          adminComs.forEach(com => {
            const comAgencies = allUsers.filter(u =>
              u.userType === 'agencia' && u.parentId === com.id
            )
            comAgencies.forEach(agency => {
              const agencyTaquillas = allUsers.filter(u =>
                u.userType === 'taquilla' && u.parentId === agency.id
              )
              agencyTaquillas.forEach(t => {
                sales += salesByTaquilla.get(t.id) || 0
                prizes += prizesByTaquilla.get(t.id) || 0
              })
            })
          })
        }

        const commissionPercent = entity.shareOnSales || 0
        const commission = sales * (commissionPercent / 100)
        const balance = sales - prizes - commission

        // Calcular ganancia para comercializadoras, subdistribuidores y agencias
        let profit = 0
        let profitPercent = 0
        if (rootType === 'comercializadora' || rootType === 'subdistribuidor' || rootType === 'agencia' || 
            entity.userType === 'comercializadora' || entity.userType === 'subdistribuidor' || entity.userType === 'agencia') {
          profitPercent = entity.shareOnProfits || 0
          profit = balance > 0 ? balance * (profitPercent / 100) : 0
        }

        // Determinar si tiene hijos
        let hasChildren = false
        if (rootType === 'admin') {
          hasChildren = allUsers.some(u =>
            u.userType === 'comercializadora' &&
            u.parentId === entity.id
          )
        } else if (rootType === 'comercializadora' || entity.userType === 'comercializadora') {
          // Una comercializadora puede tener subdistribuidores o agencias
          hasChildren = allUsers.some(u =>
            (u.userType === 'subdistribuidor' || u.userType === 'agencia') && 
            u.parentId === entity.id
          )
        } else if (entity.userType === 'subdistribuidor') {
          hasChildren = allUsers.some(u =>
            u.userType === 'agencia' && u.parentId === entity.id
          )
        } else if (rootType === 'agencia' || entity.userType === 'agencia') {
          hasChildren = allUsers.some(u =>
            u.userType === 'taquilla' && u.parentId === entity.id
          )
        }

        return {
          id: entity.id,
          name: entity.name,
          type: rootType === 'admin' ? 'admin' : (entity.userType as any),
          sales,
          prizes,
          commission,
          commissionPercent,
          balance,
          profit: (rootType === 'comercializadora' || rootType === 'subdistribuidor' || rootType === 'agencia' || 
                   entity.userType === 'comercializadora' || entity.userType === 'subdistribuidor' || entity.userType === 'agencia') ? profit : undefined,
          profitPercent: (rootType === 'comercializadora' || rootType === 'subdistribuidor' || rootType === 'agencia' || 
                         entity.userType === 'comercializadora' || entity.userType === 'subdistribuidor' || entity.userType === 'agencia') ? profitPercent : undefined,
          parentId: entity.parentId,
          hasChildren
        }
      })

      // Ordenar por ventas descendente
      stats.sort((a, b) => b.sales - a.sales)

      setRootEntities(stats)
    } catch (err: any) {
      console.error('Error loading hierarchical stats:', err)
      setError(err.message || 'Error al cargar estadísticas')
    } finally {
      setLoading(false)
    }
  }, [currentUser, allUsers, dateFrom, dateTo, rootType])

  // Cargar stats cuando cambien las dependencias
  useEffect(() => {
    loadStats()
  }, [loadStats])

  return {
    rootType,
    rootEntities,
    loading,
    error,
    refresh: loadStats
  }
}
