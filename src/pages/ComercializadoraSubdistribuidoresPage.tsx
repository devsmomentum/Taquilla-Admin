import { useParams, Link } from 'react-router-dom'
import { useApp } from '@/contexts/AppContext'
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CaretLeft } from "@phosphor-icons/react"
import { SubdistribuidoresTab } from "@/components/SubdistribuidoresTab"

export function ComercializadoraSubdistribuidoresPage() {
  const { id } = useParams<{ id: string }>()
  const { 
    subdistribuidores,
    comercializadoras,
    subdistribuidoresLoading,
    createSubdistribuidor,
    updateSubdistribuidor,
    deleteSubdistribuidor,
    currentUser,
    createUser
  } = useApp()

  // Encontrar la comercializadora
  const comercializadora = comercializadoras.find(c => c.id === id)

  // Filtrar subdistribuidores que pertenecen a esta comercializadora
  const comercializadoraSubdistribuidores = subdistribuidores.filter(s => s.parentId === id)

  if (!comercializadora) {
    return (
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <p className="text-muted-foreground">Comercializadora no encontrada</p>
            <Button
              variant="link"
              className="mt-4"
              onClick={() => window.history.back()}
            >
              Volver
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link 
          to="/comercializadores" 
          className="hover:text-foreground transition-colors"
        >
          Comercializadores
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">{comercializadora.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.history.back()}
          className="h-8 w-8"
        >
          <CaretLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Subdistribuidores de {comercializadora.name}</h1>
          <p className="text-muted-foreground">Gestiona los subdistribuidores de esta comercializadora</p>
        </div>
      </div>

      {/* Content */}
      <Card className="shadow-sm">
        <CardContent className="p-6">
          <SubdistribuidoresTab
            subdistribuidores={comercializadoraSubdistribuidores}
            isLoading={subdistribuidoresLoading}
            onCreate={createSubdistribuidor}
            onUpdate={updateSubdistribuidor}
            onDelete={async (id: string) => {
              await deleteSubdistribuidor(id)
            }}
            currentUserId={currentUser?.id}
            createUser={createUser}
            comercializadoraId={id!}
          />
        </CardContent>
      </Card>
    </div>
  )
}