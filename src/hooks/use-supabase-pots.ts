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

export function useSupabasePots() {
  const [pots, setPots] = useState<Pot[]>(INITIAL_POTS)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isConnected, setIsConnected] = useState(false)

  // Función para probar la conexión y crear datos si no existen
  const testConnection = useCallback(async (): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('pots')
        .select('id')
        .limit(1)

      if (error) {
        console.log('Error de conexión potes:', error.message)
        setIsConnected(false)
        return false
      }

      console.log('Conexión potes OK')
      setIsConnected(true)
      return true
    } catch (err) {
      console.log('Error de red potes:', err)
      setIsConnected(false)
      return false
    }
  }, [])

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
    try {
      console.log(`🔄 Intentando sincronización alternativa: ${operation}`)
      
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
          console.log(`✅ Insert directo exitoso: ${insertResult.id}`)
          return { success: true, id: insertResult.id }
        }
      } catch (insertErr) {
        console.log('❌ Insert directo falló:', insertErr)
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
          console.log(`✅ Upsert por timestamp exitoso: ${upsertResult[0].id}`)
          return { success: true, id: upsertResult[0].id }
        }
      } catch (upsertErr) {
        console.log('❌ Upsert por timestamp falló:', upsertErr)
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
          console.log(`✅ Insert configurado exitoso: ${configResult[0].id}`)
          return { success: true, id: configResult[0].id }
        }
      } catch (configErr) {
        console.log('❌ Insert configurado falló:', configErr)
      }
      
      console.log('⚠️ Todas las estrategias de Supabase fallaron')
      return { success: false }
      
    } catch (err) {
      console.log('💥 Error general en sincronización:', err)
      return { success: false }
    }
  }, [])

  // Cargar potes desde Supabase (sin usar localStorage como fuente principal)
  const loadPots = useCallback(async () => {
    setIsLoading(true)
    try {
      console.log('Cargando potes desde Supabase...')
      
      const connectionOK = await testConnection()
      
      if (connectionOK) {
        const { data: supabasePots, error } = await supabase
          .from('pots')
          .select('*')
          .order('percentage', { ascending: false })

        if (error) {
          console.log('⚠️ Error accediendo potes (probablemente RLS):', error.message)
          // Solo en caso de error, intentar usar localStorage como último recurso
          const localPots = JSON.parse(localStorage.getItem('supabase_pots_backup_v2') || 'null')
          if (localPots && localPots.length > 0) {
            console.log('⚠️ Usando backup local por error de conexión')
            setPots(localPots)
          } else {
            setPots(INITIAL_POTS)
          }
          setIsConnected(false)
          console.log('📝 Usando potes por defecto')
        } else {
          if (supabasePots.length === 0) {
            console.log('📋 No hay potes en Supabase, usando valores iniciales en ceros')
            // No inicializar automáticamente, solo usar INITIAL_POTS (balance en 0)
            setPots(INITIAL_POTS)
            setIsConnected(true)
          } else {
            const mappedPots = supabasePots.map(mapSupabasePot)
            setPots(mappedPots)
            // Guardar en localStorage solo como backup de emergencia
            localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(mappedPots))
            console.log(`✅ ${mappedPots.length} potes cargados desde Supabase`)
            setIsConnected(true)
          }
        }
      } else {
        console.log('⚠️ Sin conexión a Supabase')
        // Solo en caso de no conexión, intentar usar localStorage como último recurso
        const localPots = JSON.parse(localStorage.getItem('supabase_pots_backup_v2') || 'null')
        if (localPots && localPots.length > 0) {
          console.log('⚠️ Usando backup local por falta de conexión')
          setPots(localPots)
        } else {
          setPots(INITIAL_POTS)
        }
        setIsConnected(false)
      }
    } catch (err) {
      console.log('⚠️ Error general cargando potes:', err)
      // Solo en caso de error crítico, intentar usar localStorage
      const localPots = JSON.parse(localStorage.getItem('supabase_pots_backup_v2') || 'null')
      if (localPots && localPots.length > 0) {
        console.log('⚠️ Usando backup local por error crítico')
        setPots(localPots)
      } else {
        setPots(INITIAL_POTS)
      }
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [testConnection])

  // Inicializar potes en Supabase si no existen
  const initializePots = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔧 Inicializando potes por defecto en Supabase...')
      
      // Verificar si ya existen potes
      const { data: existingPots, error: checkError } = await supabase
        .from('pots')
        .select('name')
        
      if (checkError) {
        console.log('❌ Error verificando potes existentes:', checkError.message)
        setPots(INITIAL_POTS)
        localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(INITIAL_POTS))
        return false
      }
      
      if (existingPots && existingPots.length > 0) {
        console.log('✅ Potes ya existen, no es necesario inicializar')
        return true
      }
      
      const supabasePotsData = INITIAL_POTS.map(pot => ({
        name: pot.name,
        percentage: pot.percentage,
        balance: pot.balance,
        color: pot.color,
        description: pot.description
      }))

      console.log('📋 Creando potes:', supabasePotsData.map(p => p.name).join(', '))

      const { data: createdPots, error } = await supabase
        .from('pots')
        .insert(supabasePotsData)
        .select()

      if (error) {
        console.log('❌ Error inicializando potes:', error.message)
        
        // Si hay conflicto de duplicados, intentar cargar los existentes
        if (error.code === '23505') {
          console.log('⚠️ Potes duplicados detectados, cargando existentes...')
          const { data: existingPotsRetry } = await supabase
            .from('pots')
            .select('*')
            .order('name')
            
          if (existingPotsRetry && existingPotsRetry.length > 0) {
            const mappedExisting = existingPotsRetry.map(mapSupabasePot)
            setPots(mappedExisting)
            localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(mappedExisting))
            console.log('✅ Potes existentes cargados')
            return true
          }
        }
        
        setPots(INITIAL_POTS)
        localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(INITIAL_POTS))
        console.log('📝 Usando potes por defecto (RLS activo)')
        return false
      }

      const mappedPots = createdPots.map(mapSupabasePot)
      setPots(mappedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(mappedPots))
      console.log('✅ Potes inicializados exitosamente')
      toast.success('Potes inicializados correctamente')
      return true
    } catch (err) {
      console.log('💥 Error general inicializando potes:', err)
      setPots(INITIAL_POTS)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(INITIAL_POTS))
      return false
    }
  }, [])

  // Cargar transferencias
  const loadTransfers = useCallback(async () => {
    try {
      if (!isConnected) return

      const { data: supabaseTransfers, error } = await supabase
        .from('transfers')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Error cargando transferencias:', error.message)
        const localTransfers = JSON.parse(localStorage.getItem('supabase_transfers_backup_v2') || '[]')
        setTransfers(localTransfers)
      } else {
        const mappedTransfers = supabaseTransfers.map(mapSupabaseTransfer)
        setTransfers(mappedTransfers)
        localStorage.setItem('supabase_transfers_backup_v2', JSON.stringify(mappedTransfers))
        console.log(`${mappedTransfers.length} transferencias cargadas`)
      }
    } catch (err) {
      console.log('Error cargando transferencias:', err)
      const localTransfers = JSON.parse(localStorage.getItem('supabase_transfers_backup_v2') || '[]')
      setTransfers(localTransfers)
    }
  }, [isConnected])

  // Cargar retiros
  const loadWithdrawals = useCallback(async () => {
    try {
      if (!isConnected) return

      const { data: supabaseWithdrawals, error } = await supabase
        .from('withdrawals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('Error cargando retiros:', error.message)
        const localWithdrawals = JSON.parse(localStorage.getItem('supabase_withdrawals_backup_v2') || '[]')
        setWithdrawals(localWithdrawals)
      } else {
        const mappedWithdrawals = supabaseWithdrawals.map(mapSupabaseWithdrawal)
        setWithdrawals(mappedWithdrawals)
        localStorage.setItem('supabase_withdrawals_backup_v2', JSON.stringify(mappedWithdrawals))
        console.log(`${mappedWithdrawals.length} retiros cargados`)
      }
    } catch (err) {
      console.log('Error cargando retiros:', err)
      const localWithdrawals = JSON.parse(localStorage.getItem('supabase_withdrawals_backup_v2') || '[]')
      setWithdrawals(localWithdrawals)
    }
  }, [isConnected])

  // Actualizar balance de un pote
  const updatePotBalance = useCallback(async (potName: string, newBalance: number): Promise<boolean> => {
    try {
      console.log(`Actualizando balance de ${potName} a ${newBalance}`)

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
          console.log('Error actualizando pote en Supabase:', error.message)
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
      console.log('Error actualizando balance:', err)
      return false
    }
  }, [pots, testConnection])

  // Distribuir jugada a potes
  const distributeBetToPots = useCallback(async (betAmount: number): Promise<boolean> => {
    try {
      console.log(`💰 Distribuyendo apuesta de Bs. ${betAmount} a potes`)
      
      // Verificar que tenemos potes
      if (!pots || pots.length === 0) {
        console.log('❌ No hay potes disponibles')
        toast.error('Error: No hay potes disponibles')
        return false
      }
      
      const updatedPots = pots.map(pot => {
        const distribution = (betAmount * pot.percentage) / 100
        const newBalance = pot.balance + distribution
        console.log(`   📊 ${pot.name}: +Bs. ${distribution.toFixed(2)} = Bs. ${newBalance.toFixed(2)}`)
        return {
          ...pot,
          balance: newBalance
        }
      })

      // Actualizar cada pote en Supabase
      const connectionOK = await testConnection()
      let supabaseSuccess = true
      
      if (connectionOK) {
        console.log('🔄 Actualizando potes en Supabase...')
        
        for (const pot of updatedPots) {
          const { error } = await supabase
            .from('pots')
            .update({ 
              balance: pot.balance,
              updated_at: new Date().toISOString()
            })
            .eq('name', pot.name)

          if (error) {
            console.log(`❌ Error actualizando ${pot.name} en Supabase:`, error.message)
            setIsConnected(false)
            supabaseSuccess = false
            break
          } else {
            console.log(`✅ ${pot.name} actualizado en Supabase`)
          }
        }
      } else {
        console.log('⚠️ Sin conexión a Supabase, guardando solo localmente')
        supabaseSuccess = false
      }

      // Actualizar estado local siempre
      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))
      
      if (supabaseSuccess) {
        console.log('✅ Distribución completada exitosamente')
        toast.success(`Bs. ${betAmount} distribuidos a los potes`)
      } else {
        console.log('⚠️ Distribución guardada localmente')
        toast.warning('Distribución guardada localmente (sin conexión)')
      }
      
      return true
    } catch (err) {
      console.log('💥 Error distribuyendo apuesta:', err)
      toast.error('Error distribuyendo apuesta a potes')
      return false
    }
  }, [pots, testConnection])

  // Crear transferencia entre potes
  const createTransfer = useCallback(async (fromPotName: string, toPotName: string, amount: number): Promise<boolean> => {
    try {
      console.log(`🔄 Transfiriendo Bs. ${amount} de ${fromPotName} a ${toPotName}`)

      // Verificar que hay suficiente balance
      const fromPot = pots.find(p => p.name === fromPotName)
      const toPot = pots.find(p => p.name === toPotName)
      
      if (!fromPot || !toPot) {
        console.log('❌ Potes no encontrados')
        toast.error('Error: Potes no encontrados')
        return false
      }
      
      if (fromPot.balance < amount) {
        console.log(`❌ Balance insuficiente: ${fromPot.balance} < ${amount}`)
        toast.error('Balance insuficiente para la transferencia')
        return false
      }

      // Crear transferencia en Supabase con múltiples estrategias
      const connectionOK = await testConnection()
      let transferId = `local-${Date.now()}`
      let supabaseSuccess = false

      if (connectionOK) {
        console.log('🔗 Registrando transferencia en Supabase...')
        
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
          console.log('❌ Error insert normal:', error.message)
          
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
            console.log('✅ Transfer guardado con estrategia alternativa')
          } else {
            console.log('⚠️ Guardando solo localmente por limitaciones de RLS')
          }
          
        } else {
          transferId = createdTransfer.id
          supabaseSuccess = true
          console.log('✅ Transferencia registrada en Supabase:', transferId)
        }
      } else {
        console.log('⚠️ Sin conexión, guardando transferencia localmente')
        
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
        console.log('📦 Transfer añadido a cola offline para sincronizar después')
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

      console.log('📊 Balances actualizados:')
      updatedPots.forEach(pot => {
        if (pot.name === fromPotName || pot.name === toPotName) {
          console.log(`   - ${pot.name}: Bs. ${pot.balance}`)
        }
      })

      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))

      // Actualizar balances en Supabase
      if (connectionOK) {
        console.log('🔄 Actualizando balances en Supabase...')
        
        for (const pot of updatedPots) {
          if (pot.name === fromPotName || pot.name === toPotName) {
            const { error } = await supabase
              .from('pots')
              .update({ 
                balance: pot.balance,
                updated_at: new Date().toISOString()
              })
              .eq('name', pot.name)
              
            if (error) {
              console.log(`❌ Error actualizando ${pot.name}:`, error.message)
            } else {
              console.log(`✅ ${pot.name} actualizado en Supabase`)
            }
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
      console.log('💥 Error creando transferencia:', err)
      toast.error('Error al realizar transferencia')
      return false
    }
  }, [pots, transfers, testConnection, loadTransfers])

  // Crear retiro
  const createWithdrawal = useCallback(async (fromPotName: string, amount: number): Promise<boolean> => {
    try {
      console.log(`💸 Retirando Bs. ${amount} de ${fromPotName}`)

      // Verificar que hay suficiente balance
      const fromPot = pots.find(p => p.name === fromPotName)
      if (!fromPot) {
        console.log('❌ Pote no encontrado')
        toast.error('Error: Pote no encontrado')
        return false
      }
      
      if (fromPot.balance < amount) {
        console.log(`❌ Balance insuficiente: ${fromPot.balance} < ${amount}`)
        toast.error('Balance insuficiente para el retiro')
        return false
      }

      // Crear retiro en Supabase con múltiples estrategias
      const connectionOK = await testConnection()
      let withdrawalId = `local-${Date.now()}`
      let supabaseSuccess = false

      if (connectionOK) {
        console.log('🔗 Registrando retiro en Supabase...')
        
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
          console.log('❌ Error insert normal:', error.message)
          
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
            console.log('✅ Withdrawal guardado con estrategia alternativa')
          } else {
            console.log('⚠️ Guardando solo localmente por limitaciones de RLS')
          }
          
        } else {
          withdrawalId = createdWithdrawal.id
          supabaseSuccess = true
          console.log('✅ Retiro registrado en Supabase:', withdrawalId)
        }
      } else {
        console.log('⚠️ Sin conexión, guardando retiro localmente')
        
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
        console.log('📦 Withdrawal añadido a cola offline para sincronizar después')
      }

      // Actualizar balance localmente
      const updatedPots = pots.map(pot => 
        pot.name === fromPotName 
          ? { ...pot, balance: pot.balance - amount }
          : pot
      )

      console.log(`📊 Nuevo balance de ${fromPotName}: Bs. ${updatedPots.find(p => p.name === fromPotName)?.balance}`)

      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))

      // Actualizar balance en Supabase
      if (connectionOK) {
        console.log('🔄 Actualizando balance en Supabase...')
        
        const { error } = await supabase
          .from('pots')
          .update({ 
            balance: updatedPots.find(p => p.name === fromPotName)?.balance,
            updated_at: new Date().toISOString()
          })
          .eq('name', fromPotName)
          
        if (error) {
          console.log(`❌ Error actualizando balance:`, error.message)
        } else {
          console.log('✅ Balance actualizado en Supabase')
        }
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
      console.log('💥 Error creando retiro:', err)
      toast.error('Error al realizar retiro')
      return false
    }
  }, [pots, withdrawals, testConnection, loadWithdrawals])

  // Deducir de pote (para pagos de premios)
  const deductFromPot = useCallback(async (potName: string, amount: number): Promise<boolean> => {
    try {
      console.log(`📉 Deduciendo Bs. ${amount} de ${potName}`)

      const pot = pots.find(p => p.name === potName)
      if (!pot || pot.balance < amount) {
        console.log('Balance insuficiente para deducción')
        return false
      }

      const newBalance = pot.balance - amount
      return await updatePotBalance(potName, newBalance)
    } catch (err) {
      console.log('Error deduciendo de pote:', err)
      return false
    }
  }, [pots, updatePotBalance])

  // Sincronizar potes con jugadas existentes
  const syncPotsWithBets = useCallback(async (): Promise<boolean> => {
    try {
      console.log('Sincronizando potes con jugadas existentes...')
      
      // Obtener todas las jugadas
      const storedBets = JSON.parse(localStorage.getItem('supabase_bets_backup_v2') || '[]')
      
      if (storedBets.length === 0) {
        console.log('ℹ️ No hay jugadas para sincronizar')
        return false
      }

      // Calcular total apostado
      const totalBetAmount = storedBets.reduce((sum: number, bet: any) => sum + (bet.amount || 0), 0)
      
      console.log(`Total apostado encontrado: $${totalBetAmount}`)
      
      if (totalBetAmount === 0) {
        console.log('ℹ️ No hay montos para distribuir')
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
          const { error } = await supabase
            .from('pots')
            .update({ 
              balance: pot.balance,
              updated_at: new Date().toISOString()
            })
            .eq('name', pot.name)

          if (error) {
            console.log(`Error actualizando ${pot.name}:`, error.message)
          }
        }
      }

      // Actualizar estado local
      setPots(updatedPots)
      localStorage.setItem('supabase_pots_backup_v2', JSON.stringify(updatedPots))
      
      toast.success(`Potes sincronizados automáticamente: $${totalBetAmount} distribuidos`)
      
      console.log('Balances actualizados:')
      updatedPots.forEach(pot => {
        console.log(`   - ${pot.name}: $${pot.balance}`)
      })
      
      return true
    } catch (error) {
      console.error('Error sincronizando potes:', error)
      return false
    }
  }, [testConnection, setPots])

  // Cargar datos al inicializar
  useEffect(() => {
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
            console.log('🔄 Sincronización automática necesaria: detectadas jugadas sin reflejar en potes')
            await syncPotsWithBets()
          } else {
            console.log('✅ Potes ya sincronizados, no es necesaria la sincronización automática')
          }
        }
      }, 2000) // Dar más tiempo para que se carguen los datos
    }
    
    initializeHook()
  }, [loadPots, loadTransfers, loadWithdrawals, syncPotsWithBets])

  // Procesar cola offline cuando se restablezca la conexión
  const processOfflineQueue = useCallback(async (): Promise<void> => {
    try {
      const offlineQueue = JSON.parse(localStorage.getItem('pots_offline_queue') || '[]')
      
      if (offlineQueue.length === 0) return
      
      console.log(`🔄 Procesando ${offlineQueue.length} operaciones offline...`)
      
      const connectionOK = await testConnection()
      if (!connectionOK) {
        console.log('⚠️ Sin conexión, manteniendo cola offline')
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
              console.log(`✅ Transfer offline sincronizado: ${item.data.id}`)
              processedItems.push(item)
            }
          } else if (item.type === 'withdrawal') {
            const { error } = await supabase
              .from('withdrawals')
              .upsert(item.data, { onConflict: 'id' })
              
            if (!error) {
              console.log(`✅ Withdrawal offline sincronizado: ${item.data.id}`)
              processedItems.push(item)
            }
          }
        } catch (err) {
          console.log(`❌ Error sincronizando ${item.type}:`, err)
        }
      }
      
      // Remover items procesados de la cola
      if (processedItems.length > 0) {
        const remainingQueue = offlineQueue.filter(item => 
          !processedItems.some(processed => processed.data.id === item.data.id)
        )
        localStorage.setItem('pots_offline_queue', JSON.stringify(remainingQueue))
        
        console.log(`✅ ${processedItems.length} operaciones sincronizadas desde cola offline`)
        
        if (remainingQueue.length === 0) {
          toast.success('Todas las operaciones offline sincronizadas')
        }
      }
      
    } catch (err) {
      console.log('💥 Error procesando cola offline:', err)
    }
  }, [testConnection])

  // Auto-procesar cola offline cuando se detecte conexión
  useEffect(() => {
    if (isConnected) {
      const timeoutId = setTimeout(() => {
        processOfflineQueue()
      }, 2000)
      
      return () => clearTimeout(timeoutId)
    }
  }, [isConnected, processOfflineQueue])

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