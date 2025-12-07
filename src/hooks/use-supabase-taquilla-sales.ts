import { useState, useEffect, useCallback } from 'react'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export interface TaquillaSale {
  id: string
  taquillaId: string
  amount: number
  saleDate: string
  notes?: string
  createdAt: string
}

export function useSupabaseTaquillaSales() {
  const [sales, setSales] = useState<TaquillaSale[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadSales = useCallback(async () => {
    if (!isSupabaseConfigured()) return

    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('taquilla_sales')
        .select('*')
        .order('sale_date', { ascending: false })

      if (error) throw error

      const mappedSales: TaquillaSale[] = (data || []).map((s: any) => ({
        id: s.id,
        taquillaId: s.taquilla_id,
        amount: s.amount,
        saleDate: s.sale_date,
        notes: s.notes,
        createdAt: s.created_at
      }))

      setSales(mappedSales)
    } catch (error) {
      // Error loading sales - table may not exist
      setSales([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  const createSale = async (sale: Omit<TaquillaSale, 'id' | 'createdAt'>) => {
    try {
      const { data, error } = await supabase
        .from('taquilla_sales')
        .insert({
          taquilla_id: sale.taquillaId,
          amount: sale.amount,
          sale_date: sale.saleDate,
          notes: sale.notes
        })
        .select()
        .single()

      if (error) throw error

      await loadSales()
      return true
    } catch (error) {
      return false
    }
  }

  const deleteSale = async (id: string) => {
    try {
      const { error } = await supabase
        .from('taquilla_sales')
        .delete()
        .eq('id', id)

      if (error) throw error

      await loadSales()
      return true
    } catch (error) {
      return false
    }
  }

  useEffect(() => {
    loadSales()
  }, [loadSales])

  return {
    sales,
    isLoading,
    createSale,
    deleteSale,
    loadSales
  }
}
