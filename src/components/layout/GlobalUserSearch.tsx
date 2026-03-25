import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { MagnifyingGlass, Buildings, TreeStructure, Building, Storefront, ArrowRight } from '@phosphor-icons/react'

type SearchEntityType = 'comercializadora' | 'subdistribuidor' | 'agencia' | 'taquilla'

interface SearchResult {
  id: string
  type: SearchEntityType
  name: string
  email: string
  isActive: boolean
  description?: string
  targetPath: string
}

interface GlobalUserSearchProps {
  compact?: boolean
}

const TYPE_ORDER: SearchEntityType[] = ['comercializadora', 'subdistribuidor', 'agencia', 'taquilla']

const TYPE_LABEL: Record<SearchEntityType, string> = {
  comercializadora: 'Comercializadora',
  subdistribuidor: 'Sub Distribuidora',
  agencia: 'Agencia',
  taquilla: 'Taquilla'
}

const TYPE_ICON: Record<SearchEntityType, any> = {
  comercializadora: Buildings,
  subdistribuidor: TreeStructure,
  agencia: Building,
  taquilla: Storefront
}

export function GlobalUserSearch({ compact = false }: GlobalUserSearchProps) {
  const {
    currentUser,
    comercializadoras,
    subdistribuidores,
    visibleAgencies,
    visibleTaquillas
  } = useApp()

  const navigate = useNavigate()
  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const comercializadoraById = useMemo(
    () => new Map(comercializadoras.map((item) => [item.id, item])),
    [comercializadoras]
  )

  const subdistribuidorById = useMemo(
    () => new Map(subdistribuidores.map((item) => [item.id, item])),
    [subdistribuidores]
  )

  const agencyById = useMemo(
    () => new Map(visibleAgencies.map((item) => [item.id, item])),
    [visibleAgencies]
  )

  const allResults = useMemo(() => {
    const results: SearchResult[] = []

    comercializadoras.forEach((item) => {
      const targetPath = `/comercializadores/${item.id}/subdistribuidores`
      results.push({
        id: item.id,
        type: 'comercializadora',
        name: item.name,
        email: item.email,
        isActive: item.isActive,
        description: 'Gestiona sus subdistribuidores',
        targetPath
      })
    })

    subdistribuidores.forEach((item) => {
      if (!item.parentId) return

      const isSelf = currentUser?.userType === 'subdistribuidor' && currentUser.id === item.id
      const targetPath = isSelf
        ? '/subdistribuidor/agencias'
        : `/comercializadores/${item.parentId}/subdistribuidores/${item.id}/agencias`

      results.push({
        id: item.id,
        type: 'subdistribuidor',
        name: item.name,
        email: item.email,
        isActive: item.isActive,
        description: 'Gestiona sus agencias',
        targetPath
      })
    })

    visibleAgencies.forEach((item) => {
      const isSelf = currentUser?.userType === 'agencia' && currentUser.id === item.id
      let targetPath = isSelf ? '/agencia/taquillas' : ''

      if (!targetPath) {
        const parentSubdist = subdistribuidorById.get(item.parentId)
        if (parentSubdist?.parentId) {
          targetPath = `/comercializadores/${parentSubdist.parentId}/subdistribuidores/${parentSubdist.id}/agencias/${item.id}/taquillas`
        } else if (comercializadoraById.has(item.parentId)) {
          targetPath = `/comercializadores/${item.parentId}/agencias/${item.id}/taquillas`
        }
      }

      if (!targetPath) return

      results.push({
        id: item.id,
        type: 'agencia',
        name: item.name,
        email: item.email || '',
        isActive: item.isActive,
        description: 'Gestiona sus taquillas',
        targetPath
      })
    })

    visibleTaquillas.forEach((item) => {
      if (!item.parentId) return

      const parentAgency = agencyById.get(item.parentId)
      if (!parentAgency) return

      const parentSubdist = subdistribuidorById.get(parentAgency.parentId)
      let basePath = ''

      if (parentSubdist?.parentId) {
        basePath = `/comercializadores/${parentSubdist.parentId}/subdistribuidores/${parentSubdist.id}/agencias/${parentAgency.id}/taquillas`
      } else if (comercializadoraById.has(parentAgency.parentId)) {
        basePath = `/comercializadores/${parentAgency.parentId}/agencias/${parentAgency.id}/taquillas`
      } else if (currentUser?.userType === 'agencia' && currentUser.id === parentAgency.id) {
        basePath = '/agencia/taquillas'
      }

      if (!basePath) return

      results.push({
        id: item.id,
        type: 'taquilla',
        name: item.fullName,
        email: item.email,
        isActive: item.isApproved,
        description: `Agencia: ${parentAgency.name}`,
        targetPath: basePath
      })
    })

    return results
  }, [
    agencyById,
    comercializadoraById,
    comercializadoras,
    currentUser,
    subdistribuidorById,
    subdistribuidores,
    visibleAgencies,
    visibleTaquillas
  ])

  const filteredResults = useMemo(() => {
    const text = query.trim().toLowerCase()
    if (text.length < 2) return []

    const score = (value: SearchResult) => {
      const name = value.name.toLowerCase()
      const email = value.email.toLowerCase()

      if (name.startsWith(text)) return 0
      if (name.includes(text)) return 1
      if (email.startsWith(text)) return 2
      if (email.includes(text)) return 3
      return 4
    }

    return allResults
      .filter((item) => {
        const name = item.name.toLowerCase()
        const email = item.email.toLowerCase()
        return name.includes(text) || email.includes(text)
      })
      .sort((a, b) => {
        const scoreDiff = score(a) - score(b)
        if (scoreDiff !== 0) return scoreDiff

        const typeDiff = TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type)
        if (typeDiff !== 0) return typeDiff

        return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
      })
      .slice(0, 30)
  }, [allResults, query])

  const groupedResults = useMemo(() => {
    return TYPE_ORDER
      .map((type) => ({
        type,
        items: filteredResults.filter((item) => item.type === type)
      }))
      .filter((group) => group.items.length > 0)
  }, [filteredResults])

  useEffect(() => {
    if (!open) return

    const onClickOutside = (event: MouseEvent) => {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [open])

  useEffect(() => {
    setActiveIndex(0)
  }, [filteredResults])

  const handleSelect = (result: SearchResult) => {
    setOpen(false)
    setMobileDialogOpen(false)
    setQuery('')
    navigate(result.targetPath)
  }

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      setOpen(true)
      return
    }

    if (!filteredResults.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((prev) => (prev + 1) % filteredResults.length)
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((prev) => (prev - 1 + filteredResults.length) % filteredResults.length)
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const selected = filteredResults[activeIndex]
      if (selected) handleSelect(selected)
    }

    if (event.key === 'Escape') {
      setOpen(false)
    }
  }

  const renderResultsList = () => {
    if (query.trim().length < 2) {
      return (
        <div className="p-3 text-xs text-muted-foreground">
          Escribe al menos 2 caracteres para buscar.
        </div>
      )
    }

    if (filteredResults.length === 0) {
      return (
        <div className="p-3 text-xs text-muted-foreground">
          No hay usuarios visibles con ese criterio.
        </div>
      )
    }

    let itemIndex = -1

    return (
      <div className="max-h-80 overflow-y-auto p-1">
        {groupedResults.map((group) => (
          <div key={group.type} className="mb-1">
            <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {TYPE_LABEL[group.type]}
            </div>
            {group.items.map((item) => {
              itemIndex += 1
              const Icon = TYPE_ICON[item.type]
              const isHighlighted = itemIndex === activeIndex

              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onMouseEnter={() => setActiveIndex(itemIndex)}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-2 text-left transition-colors',
                    isHighlighted ? 'bg-accent text-accent-foreground' : 'hover:bg-muted'
                  )}
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{item.name}</span>
                      <Badge variant={item.isActive ? 'default' : 'secondary'} className="h-4 px-1.5 text-[10px]">
                        {item.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {item.email || item.description || TYPE_LABEL[item.type]}
                    </div>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              )
            })}
          </div>
        ))}
      </div>
    )
  }

  if (compact) {
    return (
      <>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-slate-100 hover:bg-white/10 hover:text-white"
          onClick={() => setMobileDialogOpen(true)}
          title="Buscar usuarios"
        >
          <MagnifyingGlass className="h-4 w-4" />
        </Button>

        <Dialog open={mobileDialogOpen} onOpenChange={setMobileDialogOpen}>
          <DialogContent className="sm:max-w-[560px] p-0">
            <DialogHeader className="px-4 pt-4 pb-0">
              <DialogTitle>Buscar usuarios</DialogTitle>
              <DialogDescription>
                Comercializadora, Sub Distribuidora, Agencia o Taquilla
              </DialogDescription>
            </DialogHeader>
            <div className="p-4 pt-3">
              <div className="relative">
                <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  autoFocus
                  placeholder="Buscar por nombre o email..."
                  className="pl-9"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value)
                    setOpen(true)
                  }}
                  onKeyDown={onKeyDown}
                  autoComplete="off"
                />
              </div>
              <div className="mt-2 rounded-md border bg-background">
                {renderResultsList()}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    )
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      <div className="relative">
        <MagnifyingGlass className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-300" />
        <Input
          placeholder="Buscar usuarios..."
          className="h-9 border-white/20 bg-white/10 pl-9 text-sm text-white placeholder:text-slate-300 focus-visible:ring-white/30"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-11 z-50 rounded-md border bg-popover text-popover-foreground shadow-xl">
          {renderResultsList()}
        </div>
      )}
    </div>
  )
}
