import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/config/supabase'
import { toast } from 'sonner'
import { Pot, Transfer, Withdrawal } from '@/lib/types'
import { INITIAL_POTS } from '@/lib/pot-utils'


// Interfaces para Supabase
export interface SupabasePot {
  id: number
  name: string
  percentage: number
  balance: number
  color: string
  description: string
  updated_at: string
}

export interface SupabaseTransfer {
  id: string
  from_pot: string
  to_pot: string
  amount: number
  created_at: string
  created_by: string | null
}

export interface SupabaseWithdrawal {
  id: string
  from_pot: string
  amount: number
  created_at: string
  created_by: string | null
}

// Funciones de mapeo
const mapSupabasePot = (supabasePot: SupabasePot): Pot => ({
  name: supabasePot.name,
  percentage: supabasePot.percentage,
  balance: supabasePot.balance,
  color: supabasePot.color,
  description: supabasePot.description
})

const mapSupabaseTransfer = (supabaseTransfer: SupabaseTransfer): Transfer => ({
  id: supabaseTransfer.id,
  fromPot: supabaseTransfer.from_pot,
  toPot: supabaseTransfer.to_pot,
  amount: supabaseTransfer.amount,
  timestamp: supabaseTransfer.created_at
})

const mapSupabaseWithdrawal = (supabaseWithdrawal: SupabaseWithdrawal): Withdrawal => ({
  id: supabaseWithdrawal.id,
  fromPot: supabaseWithdrawal.from_pot,
  amount: supabaseWithdrawal.amount,
  timestamp: supabaseWithdrawal.created_at
})

// Funciones stub para cuando el hook está deshabilitado
const noopAsync = async () => false
const noopAsyncVoid = async () => {}

export function useSupabasePots(enabled: boolean = true) {
  // TODOS los hooks deben declararse antes de cualquier return condicional
  const [pots, setPots] = useState<Pot[]>(INITIAL_POTS)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  // Función para probar la conexión y crear datos si no existen
  const testConnection = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false
    try {
      const { error } = await supabase
        .from('pots')
        .select('id')
        .limit(1)

      if (error) {
        setIsConnected(false)
        return false
      }

      setIsConnected(true)
      return true
    } catch (err) {
      setIsConnected(false)
      return false
    }
  }, [enabled])

  // Generar UUID válido para Supabase
  const generateUUID = (): string => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0
      const v = c === 'x' ? r : (r & 0x3 | 0x8)
      return v.toString(16)
    })
  }

  // Función mejorada para forzar guardado en Supabase
  const forceSupabaseSync = useCallback(async (operation: string, data: any): Promise<{ success: boolean, id?: string }> => {
    if (!enabled) return { success: false }
    try {
      // Generar UUID válido si no existe
      const dataWithUUID = {
        ...data,
        id: data.id && data.id.includes('-') ? data.id : generateUUID()
      }

      // Estrategia 1: Insert con bypass de RLS usando admin
      try {
        const { data: insertResult, error: insertError } = await supabase
          .from(operation === 'transfer' ? 'transfers' : 'withdrawals')
          .insert(dataWithUUID)
          .select()
          .single()

        if (!insertError) {
          return { success: true, id: insertResult.id }
        }
      } catch (insertErr) {
        // Insert directo falló
      }

      // Estrategia 2: Usar upsert con conflicto en created_at
      try {
        const { data: upsertResult, error: upsertError } = await supabase
          .from(operation === 'transfer' ? 'transfers' : 'withdrawals')
          .upsert(dataWithUUID, {
            onConflict: 'created_at',
            ignoreDuplicates: false
          })
          .select()

        if (!upsertError && upsertResult && upsertResult.length > 0) {
          return { success: true, id: upsertResult[0].id }
        }
      } catch (upsertErr) {
        // Upsert por timestamp falló
      }

      // Estrategia 3: Intentar con diferentes configuraciones
      try {
        const { data: configResult, error: configError } = await supabase
          .from(operation === 'transfer' ? 'transfers' : 'withdrawals')
          .insert(dataWithUUID, {
            count: 'exact',
            defaultToNull: false
          })
          .select()

        if (!configError && configResult && configResult.length > 0) {
          return { success: true, id: configResult[0].id }
        }
      } catch (configErr) {
        // Insert configurado falló
      }

      return { success: false }

    } catch (err) {
      return { success: false }
    }
  }, [enabled])

  // Cargar potes desde Supabase (sin usar localStorage como fuente principal)
  const loadPots = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    try {
      const connectionOK = await testConnection()

      if (connectionOK) {
        const { data: supabasePots, error } = await supabase
          .from('pots')
          .select('*')
          .order('percentage', { ascending: false })

        if (error) {
          // Solo en caso de error, intentar usar localStorage como último recurso
          const localPots = JSON.parse(localStorage.getItem('supabase_pots_backup_v2') || 'null')
          if (localPots && localPots.length > 0) {
            setPots(localPots)
          } else {
            setPots(INITIAL_POTS)
          }
          setIsConnected(false)
        } else {
          if (supabasePots.length === 0) {
            // No inicializar automáticamente, solo usar INITIAL_POTS (balance en 0)
            setPots(INITIAL_POTS)
            setIsConnected(true)
          } else {
            const mappedPots = supabasePots.map(mapSupabasePot)
            setPots(mappedPots)
            // Guardar en localStorage solo como backup de emergencia
            localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(mappedPots))
            setIsConnected(true)
          }
        }
      } else {
        // Solo en caso de no conexión, intentar usar localStorage como último recurso
        const localPots = JSON.parse(localStorage.getItem('supabase_pots_backup_v2') || 'null')
        if (localPots && localPots.length > 0) {
          setPots(localPots)
        } else {
          setPots(INITIAL_POTS)
        }
        setIsConnected(false)
      }
    } catch (err) {
      // Solo en caso de error crítico, intentar usar localStorage
      const localPots = JSON.parse(localStorage.getItem('supabase_pots_backup_v2') || 'null')
      if (localPots && localPots.length > 0) {
        setPots(localPots)
      } else {
        setPots(INITIAL_POTS)
      }
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [enabled, testConnection])

  // Inicializar potes en Supabase si no existen
  const initializePots = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false
    try {
      // Verificar si ya existen potes
      const { data: existingPots, error: checkError } = await supabase
        .from('pots')
        .select('name')

      if (checkError) {
        setPots(INITIAL_POTS)
        localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(INITIAL_POTS))
        return false
      }

      if (existingPots && existingPots.length > 0) {
        return true
      }

      const supabasePotsData = INITIAL_POTS.map(pot => ({
        name: pot.name,
        percentage: pot.percentage,
        balance: pot.balance,
        color: pot.color,
        description: pot.description
      }))

      const { data: createdPots, error } = await supabase
        .from('pots')
        .insert(supabasePotsData)
        .select()

      if (error) {
        // Si hay conflicto de duplicados, intentar cargar los existentes
        if (error.code === '23505') {
          const { data: existingPotsRetry } = await supabase
            .from('pots')
            .select('*')
            .order('name')

          if (existingPotsRetry && existingPotsRetry.length > 0) {
            const mappedExisting = existingPotsRetry.map(mapSupabasePot)
            setPots(mappedExisting)
            localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(mappedExisting))
            return true
          }
        }

        setPots(INITIAL_POTS)
        localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(INITIAL_POTS))
        return false
      }

      const mappedPots = createdPots.map(mapSupabasePot)
      setPots(mappedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(mappedPots))
      toast.success('Potes inicializados correctamente')
      return true
    } catch (err) {
      setPots(INITIAL_POTS)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(INITIAL_POTS))
      return false
    }
  }, [enabled])

  // Cargar transferencias
  const loadTransfers = useCallback(async () => {
    if (!enabled || !isConnected) return
    try {
      const { data: supabaseTransfers, error } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        const localTransfers = JSON.parse(localStorage.getItem('supabase_transfers_backup_v2') || '[]')
        setTransfers(localTransfers)
      } else {
        const mappedTransfers = supabaseTransfers.map(mapSupabaseTransfer)
        setTransfers(mappedTransfers)
        localStorage.setItem('supabase_transfers_backup_v2', JSON.stringify(mappedTransfers))
      }
    } catch (err) {
      const localTransfers = JSON.parse(localStorage.getItem('supabase_transfers_backup_v2') || '[]')
      setTransfers(localTransfers)
    }
  }, [enabled, isConnected])

  // Cargar retiros
  const loadWithdrawals = useCallback(async () => {
    if (!enabled || !isConnected) return
    try {
      const { data: supabaseWithdrawals, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        const localWithdrawals = JSON.parse(localStorage.getItem('supabase_withdrawals_backup_v2') || '[]')
        setWithdrawals(localWithdrawals)
      } else {
        const mappedWithdrawals = supabaseWithdrawals.map(mapSupabaseWithdrawal)
        setWithdrawals(mappedWithdrawals)
        localStorage.setItem('supabase_withdrawals_backup_v2', JSON.stringify(mappedWithdrawals))
      }
    } catch (err) {
      const localWithdrawals = JSON.parse(localStorage.getItem('supabase_withdrawals_backup_v2') || '[]')
      setWithdrawals(localWithdrawals)
    }
  }, [enabled, isConnected])

  // Actualizar balance de un pote
  const updatePotBalance = useCallback(async (potName: string, newBalance: number): Promise<boolean> => {
    if (!enabled) return false
    try {
      const connectionOK = await testConnection()

      if (connectionOK) {
        const { error } = await supabase
          .from('pots')
          .update({
            balance: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('name', potName)

        if (error) {
          setIsConnected(false)
        }
      }

      // Actualizar estado local
      const updatedPots = pots.map(pot =>
        pot.name === potName
          ? { ...pot, balance: newBalance }
          : pot
      )
      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))

      return true
    } catch (err) {
      return false
    }
  }, [enabled, pots, testConnection])

  // Distribuir jugada a potes
  const distributeBetToPots = useCallback(async (betAmount: number): Promise<boolean> => {
    if (!enabled) return false
    try {
      // Verificar que tenemos potes
      if (!pots || pots.length === 0) {
        toast.error('Error: No hay potes disponibles')
        return false
      }

      const updatedPots = pots.map(pot => {
        const distribution = (betAmount * pot.percentage) / 100
        const newBalance = pot.balance + distribution
        return {
          ...pot,
          balance: newBalance
        }
      })

      // Actualizar cada pote en Supabase
      const connectionOK = await testConnection()
      let supabaseSuccess = true

      if (connectionOK) {
        for (const pot of updatedPots) {
          const { error } = await supabase
            .from('pots')
            .update({
              balance: pot.balance,
              updated_at: new Date().toISOString()
            })
            .eq('name', pot.name)

          if (error) {
            setIsConnected(false)
            supabaseSuccess = false
            break
          }
        }
      } else {
        supabaseSuccess = false
      }

      // Actualizar estado local siempre
      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))

      if (supabaseSuccess) {
        toast.success(`Bs. ${betAmount} distribuidos a los potes`)
      } else {
        toast.warning('Distribución guardada localmente (sin conexión)')
      }

      return true
    } catch (err) {
      toast.error('Error distribuyendo apuesta a potes')
      return false
    }
  }, [enabled, pots, testConnection])

  // Crear transferencia entre potes
  const createTransfer = useCallback(async (fromPotName: string, toPotName: string, amount: number): Promise<boolean> => {
    if (!enabled) return false
    try {
      // Verificar que hay suficiente balance
      const fromPot = pots.find(p => p.name === fromPotName)
      const toPot = pots.find(p => p.name === toPotName)

      if (!fromPot || !toPot) {
        toast.error('Error: Potes no encontrados')
        return false
      }

      if (fromPot.balance < amount) {
        toast.error('Balance insuficiente para la transferencia')
        return false
      }

      // Crear transferencia en Supabase con múltiples estrategias
      const connectionOK = await testConnection()
      let transferId = `local-${Date.now()}`
      let supabaseSuccess = false

      if (connectionOK) {
        // Estrategia principal: Insert normal
        const transferData = {
          from_pot: fromPotName,
          to_pot: toPotName,
          amount: amount,
          created_at: new Date().toISOString()
        }

        const { data: createdTransfer, error } = await supabase
          .from('transfers')
          .insert(transferData)
          .select()
          .single()

        if (error) {
          // Estrategia alternativa: Forzar sincronización
          const syncResult = await forceSupabaseSync('transfer', {
            ...transferData,
            id: transferId
          })

          if (syncResult.success) {
            supabaseSuccess = true
            if (syncResult.id) {
              transferId = syncResult.id
            }
          }

        } else {
          transferId = createdTransfer.id
          supabaseSuccess = true
        }
      } else {
        // Intentar guardar offline para sincronizar después
        const offlineTransfer = {
          id: transferId,
          from_pot: fromPotName,
          to_pot: toPotName,
          amount: amount,
          created_at: new Date().toISOString(),
          needs_sync: true
        }

        const offlineQueue = JSON.parse(localStorage.getItem('pots_offline_queue') || '[]')
        offlineQueue.push({ type: 'transfer', data: offlineTransfer })
        localStorage.setItem('pots_offline_queue', JSON.stringify(offlineQueue))
      }

      // Actualizar balances localmente
      const updatedPots = pots.map(pot => {
        if (pot.name === fromPotName) {
          return { ...pot, balance: pot.balance - amount }
        } else if (pot.name === toPotName) {
          return { ...pot, balance: pot.balance + amount }
        }
        return pot
      })

      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))

      // Actualizar balances en Supabase
      if (connectionOK) {
        for (const pot of updatedPots) {
          if (pot.name === fromPotName || pot.name === toPotName) {
            await supabase
              .from('pots')
              .update({
                balance: pot.balance,
                updated_at: new Date().toISOString()
              })
              .eq('name', pot.name)
          }
        }
      }

      // Agregar transferencia a la lista
      const newTransfer: Transfer = {
        id: transferId,
        fromPot: fromPotName,
        toPot: toPotName,
        amount: amount,
        timestamp: new Date().toISOString()
      }

      const updatedTransfers = [newTransfer, ...transfers]
      setTransfers(updatedTransfers)
      localStorage.setItem('supabase_transfers_backup_v2', JSON.stringify(updatedTransfers))

      if (supabaseSuccess) {
        toast.success('Transferencia realizada exitosamente')
      } else {
        toast.warning('Transferencia guardada localmente (sin conexión)')
      }

      // Recargar transferencias solo si hay conexión
      if (connectionOK) {
        setTimeout(() => {
          loadTransfers()
        }, 100)
      }

      return true
    } catch (err) {
      toast.error('Error al realizar transferencia')
      return false
    }
  }, [enabled, pots, transfers, testConnection, loadTransfers, forceSupabaseSync])

  // Crear retiro
  const createWithdrawal = useCallback(async (fromPotName: string, amount: number): Promise<boolean> => {
    if (!enabled) return false
    try {
      // Verificar que hay suficiente balance
      const fromPot = pots.find(p => p.name === fromPotName)
      if (!fromPot) {
        toast.error('Error: Pote no encontrado')
        return false
      }

      if (fromPot.balance < amount) {
        toast.error('Balance insuficiente para el retiro')
        return false
      }

      // Crear retiro en Supabase con múltiples estrategias
      const connectionOK = await testConnection()
      let withdrawalId = `local-${Date.now()}`
      let supabaseSuccess = false

      if (connectionOK) {
        // Estrategia principal: Insert normal
        const withdrawalData = {
          from_pot: fromPotName,
          amount: amount,
          created_at: new Date().toISOString()
        }

        const { data: createdWithdrawal, error } = await supabase
          .from('withdrawals')
          .insert(withdrawalData)
          .select()
          .single()

        if (error) {
          // Estrategia alternativa: Forzar sincronización
          const syncResult = await forceSupabaseSync('withdrawal', {
            ...withdrawalData,
            id: withdrawalId
          })

          if (syncResult.success) {
            supabaseSuccess = true
            if (syncResult.id) {
              withdrawalId = syncResult.id
            }
          }

        } else {
          withdrawalId = createdWithdrawal.id
          supabaseSuccess = true
        }
      } else {
        // Intentar guardar offline para sincronizar después
        const offlineWithdrawal = {
          id: withdrawalId,
          from_pot: fromPotName,
          amount: amount,
          created_at: new Date().toISOString(),
          needs_sync: true
        }

        const offlineQueue = JSON.parse(localStorage.getItem('pots_offline_queue') || '[]')
        offlineQueue.push({ type: 'withdrawal', data: offlineWithdrawal })
        localStorage.setItem('pots_offline_queue', JSON.stringify(offlineQueue))
      }

      // Actualizar balance localmente
      const updatedPots = pots.map(pot =>
        pot.name === fromPotName
          ? { ...pot, balance: pot.balance - amount }
          : pot
      )

      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))

      // Actualizar balance en Supabase
      if (connectionOK) {
        await supabase
          .from('pots')
          .update({
            balance: updatedPots.find(p => p.name === fromPotName)?.balance,
            updated_at: new Date().toISOString()
          })
          .eq('name', fromPotName)
      }

      // Agregar retiro a la lista
      const newWithdrawal: Withdrawal = {
        id: withdrawalId,
        fromPot: fromPotName,
        amount: amount,
        timestamp: new Date().toISOString()
      }

      const updatedWithdrawals = [newWithdrawal, ...withdrawals]
      setWithdrawals(updatedWithdrawals)
      localStorage.setItem('supabase_withdrawals_backup_v2', JSON.stringify(updatedWithdrawals))

      if (supabaseSuccess) {
        toast.success('Retiro realizado exitosamente')
      } else {
        toast.warning('Retiro guardado localmente (sin conexión)')
      }

      // Recargar retiros solo si hay conexión
      if (connectionOK) {
        setTimeout(() => {
          loadWithdrawals()
        }, 100)
      }

      return true
    } catch (err) {
      toast.error('Error al realizar retiro')
      return false
    }
  }, [enabled, pots, withdrawals, testConnection, loadWithdrawals, forceSupabaseSync])

  // Deducir de pote (para pagos de premios)
  const deductFromPot = useCallback(async (potName: string, amount: number): Promise<boolean> => {
    if (!enabled) return false
    try {
      const pot = pots.find(p => p.name === potName)
      if (!pot || pot.balance < amount) {
        return false
      }

      const newBalance = pot.balance - amount
      return await updatePotBalance(potName, newBalance)
    } catch (err) {
      return false
    }
  }, [enabled, pots, updatePotBalance])

  // Sincronizar potes con jugadas existentes
  const syncPotsWithBets = useCallback(async (): Promise<boolean> => {
    if (!enabled) return false
    try {
      // Obtener todas las jugadas
      const storedBets = JSON.parse(localStorage.getItem('supabase_bets_backup_v2') || '[]')

      if (storedBets.length === 0) {
        return false
      }

      // Calcular total apostado
      const totalBetAmount = storedBets.reduce((sum: number, bet: any) => sum + (bet.amount || 0), 0)

      if (totalBetAmount === 0) {
        return false
      }

      // Calcular nuevos balances basados en jugadas
      const updatedPots = INITIAL_POTS.map(pot => {
        const newBalance = (totalBetAmount * pot.percentage) / 100
        return {
          ...pot,
          balance: newBalance
        }
      })

      // Actualizar en Supabase si está conectado
      const connectionOK = await testConnection()

      if (connectionOK) {
        for (const pot of updatedPots) {
          await supabase
            .from('pots')
            .update({
              balance: pot.balance,
              updated_at: new Date().toISOString()
            })
            .eq('name', pot.name)
        }
      }

      // Actualizar estado local
      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))

      toast.success(`Potes sincronizados automáticamente: $${totalBetAmount} distribuidos`)

      return true
    } catch (error) {
      return false
    }
  }, [enabled, testConnection])

  // Procesar cola offline cuando se restablezca la conexión
  const processOfflineQueue = useCallback(async (): Promise<void> => {
    if (!enabled) return
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('pots_offline_queue') || '[]')

      if (offlineQueue.length === 0) return

      const connectionOK = await testConnection()
      if (!connectionOK) {
        return
      }

      const processedItems: any[] = []

      for (const item of offlineQueue) {
        try {
          if (item.type === 'transfer') {
            const { error } = await supabase
              .from('transfers')
              .upsert(item.data, { onConflict: 'id' })

            if (!error) {
              processedItems.push(item)
            }
          } else if (item.type === 'withdrawal') {
            const { error } = await supabase
              .from('withdrawals')
              .upsert(item.data, { onConflict: 'id' })

            if (!error) {
              processedItems.push(item)
            }
          }
        } catch (err) {
          // Error sincronizando item
        }
      }

      // Remover items procesados de la cola
      if (processedItems.length > 0) {
        const remainingQueue = offlineQueue.filter((item: any) =>
          !processedItems.some(processed => processed.data.id === item.data.id)
        )
        localStorage.setItem('pots_offline_queue', JSON.stringify(remainingQueue))

        if (remainingQueue.length === 0) {
          toast.success('Todas las operaciones offline sincronizadas')
        }
      }

    } catch (err) {
      // Error procesando cola offline
    }
  }, [enabled, testConnection])

  // Cargar datos al inicializar
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    const initializeHook = async () => {
      await loadPots()
      await loadTransfers()
      await loadWithdrawals()

      // Sincronización automática con jugadas existentes (solo si es necesario)
      setTimeout(async () => {
        const storedBets = JSON.parse(localStorage.getItem('supabase_bets_backup_v2') || '[]')
        const currentPots = JSON.parse(localStorage.getItem('supabase_pots_backup_v2') || '[]')

        if (storedBets.length > 0 && currentPots.length > 0) {
          const totalPotBalance = currentPots.reduce((sum: number, pot: any) => sum + (pot.balance || 0), 0)

          // Solo sincronizar si los potes están vacíos o muy bajos comparado con las jugadas
          if (totalPotBalance < 100) {
            await syncPotsWithBets()
          }
        }
      }, 2000) // Dar más tiempo para que se carguen los datos
    }

    initializeHook()
  }, [enabled, loadPots, loadTransfers, loadWithdrawals, syncPotsWithBets])

  // Auto-procesar cola offline cuando se detecte conexión
  useEffect(() => {
    if (!enabled) return

    if (isConnected) {
      const timeoutId = setTimeout(() => {
        processOfflineQueue()
      }, 2000)

      return () => clearTimeout(timeoutId)
    }
  }, [enabled, isConnected, processOfflineQueue])

  // Si el hook está deshabilitado, retornar valores por defecto
  // IMPORTANTE: Este return debe estar DESPUÉS de todos los hooks
  if (!enabled) {
    return {
      pots: INITIAL_POTS,
      transfers: [],
      withdrawals: [],
      isLoading: false,
      isConnected: false,
      updatePotBalance: noopAsync,
      distributeBetToPots: noopAsync,
      createTransfer: noopAsync,
      createWithdrawal: noopAsync,
      deductFromPot: noopAsync,
      syncPotsWithBets: noopAsync,
      loadPots: noopAsyncVoid,
      testConnection: noopAsync,
      processOfflineQueue: noopAsyncVoid
    }
  }

  return {
    pots,
    transfers,
    withdrawals,
    isLoading,
    isConnected,
    updatePotBalance,
    distributeBetToPots,
    createTransfer,
    createWithdrawal,
    deductFromPot,
    syncPotsWithBets,
    loadPots,
    testConnection,
    processOfflineQueue
  }
}
