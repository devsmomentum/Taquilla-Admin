import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

export type LotteryType = 'mikaela' | 'lola'

type LotteryTypeContextValue = {
  lotteryType: LotteryType
  setLotteryType: (next: LotteryType) => void
}

const STORAGE_KEY = 'taquilla-admin:lottery-type'
const DEFAULT_VALUE: LotteryType = 'mikaela'

const normalizeLotteryType = (value: unknown): LotteryType => {
  return value === 'lola' ? 'lola' : 'mikaela'
}

const readStoredLotteryType = (): LotteryType => {
  if (typeof window === 'undefined') return DEFAULT_VALUE
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return normalizeLotteryType(raw)
  } catch {
    return DEFAULT_VALUE
  }
}

const LotteryTypeContext = createContext<LotteryTypeContextValue | null>(null)

export function LotteryTypeProvider({ children }: { children: React.ReactNode }) {
  const [lotteryType, setLotteryTypeState] = useState<LotteryType>(() => readStoredLotteryType())

  const setLotteryType = (next: LotteryType) => {
    setLotteryTypeState(normalizeLotteryType(next))
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(STORAGE_KEY, lotteryType)
    } catch {
      // ignore
    }
  }, [lotteryType])

  const value = useMemo<LotteryTypeContextValue>(() => ({ lotteryType, setLotteryType }), [lotteryType])

  return <LotteryTypeContext.Provider value={value}>{children}</LotteryTypeContext.Provider>
}

export function useLotteryTypePreference(): LotteryTypeContextValue {
  const ctx = useContext(LotteryTypeContext)
  if (!ctx) {
    throw new Error('useLotteryTypePreference must be used within a LotteryTypeProvider')
  }
  return ctx
}
