import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LotteryDialog } from "@/components/LotteryDialog";
import { useApp } from "@/contexts/AppContext";
import { filterLotteries } from "@/lib/filter-utils";
import { Lottery } from "@/lib/types";
import { toast } from "sonner";
import {
  Plus,
  Calendar,
  PencilSimpleLine,
  X,
  MagnifyingGlass,
  CheckCircle,
  XCircle,
  Warning,
  Clock,
  SunHorizon,
  Moon,
} from "@phosphor-icons/react";

export function LotteriesPage() {
  const {
    lotteries,
    loadLotteries,
    createLottery,
    updateLottery,
    deleteLottery,
  } = useApp();

  const [lotteryDialogOpen, setLotteryDialogOpen] = useState(false);
  const [editingLottery, setEditingLottery] = useState<Lottery | undefined>();
  const [deleteLotteryDialogOpen, setDeleteLotteryDialogOpen] = useState(false);
  const [lotteryToDelete, setLotteryToDelete] = useState<Lottery | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [isDeleting, setIsDeleting] = useState(false);

  // Filtrar y ordenar alfabéticamente por nombre
  const filteredLotteries = filterLotteries(lotteries, search, {
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
  }).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );

  const activeCount = lotteries.filter((l) => l.isActive).length;
  const inactiveCount = lotteries.filter((l) => !l.isActive).length;

  const handleSaveLottery = async (lottery: Lottery) => {
    const exists = lotteries.find((l) => l.id === lottery.id);

    let success: boolean;
    if (exists) {
      success = await updateLottery(lottery.id, lottery);
    } else {
      success = await createLottery(lottery);
    }

    if (!success) {
      throw new Error(
        "No se pudo guardar la lotería. Revisa la consola para más detalles."
      );
    }

    // Recargar loterías para asegurar que los prizes estén actualizados
    await loadLotteries();

    setEditingLottery(undefined);
    setLotteryDialogOpen(false);
  };

  const handleEditLottery = (lottery: Lottery) => {
    setEditingLottery(lottery);
    setLotteryDialogOpen(true);
  };

  const handleDeleteClick = (lottery: Lottery) => {
    setLotteryToDelete(lottery);
    setDeleteLotteryDialogOpen(true);
  };

  const confirmDeleteLottery = async () => {
    if (!lotteryToDelete) return;

    setIsDeleting(true);
    try {
      await deleteLottery(lotteryToDelete.id);
      toast.success("Sorteo eliminado exitosamente");
      setDeleteLotteryDialogOpen(false);
      setLotteryToDelete(null);
    } catch (error) {
      toast.error("Error al eliminar sorteo");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sorteos</h2>
          <p className="text-muted-foreground">
            Gestiona los sorteos disponibles en el sistema
          </p>
        </div>
        <Button onClick={() => setLotteryDialogOpen(true)} className="gap-2">
          <Plus weight="bold" />
          Nuevo Sorteo
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <MagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            Todos ({lotteries.length})
          </Button>
          <Button
            variant={statusFilter === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("active")}
            className={
              statusFilter === "active"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : ""
            }
          >
            Activos ({activeCount})
          </Button>
          <Button
            variant={statusFilter === "inactive" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("inactive")}
            className={
              statusFilter === "inactive" ? "bg-red-600 hover:bg-red-700" : ""
            }
          >
            Inactivos ({inactiveCount})
          </Button>
        </div>
      </div>

      {/* Content */}
      {filteredLotteries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-lg font-medium">
              {search || statusFilter !== "all"
                ? "No se encontraron sorteos"
                : "No hay sorteos registrados"}
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              {search || statusFilter !== "all"
                ? "Intenta con otros criterios de búsqueda"
                : "Crea tu primer sorteo para comenzar"}
            </p>
            {!search && statusFilter === "all" && (
              <Button
                onClick={() => setLotteryDialogOpen(true)}
                variant="outline"
                className="gap-2"
              >
                <Plus weight="bold" />
                Crear Primer Sorteo
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {filteredLotteries.map((lottery) => (
            <Card
              key={lottery.id}
              className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4"
              style={{
                borderLeftColor: lottery.isActive
                  ? "rgb(16 185 129)"
                  : "rgb(156 163 175)",
              }}
            >
              <CardContent className="px-4 py-2">
                {/* Header de la card */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`h-8 w-8 rounded-md flex items-center justify-center ${
                        lottery.isActive
                          ? "bg-gradient-to-br from-blue-500 to-blue-600"
                          : "bg-gradient-to-br from-gray-400 to-gray-500"
                      }`}
                    >
                      <Calendar className="h-4 w-4 text-white" weight="fill" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm leading-tight">
                        {lottery.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Badge
                          variant={lottery.isActive ? "default" : "secondary"}
                          className={`text-[10px] px-1.5 py-0 h-4 ${
                            lottery.isActive
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : ""
                          }`}
                        >
                          {lottery.isActive ? (
                            <>
                              <CheckCircle
                                weight="fill"
                                className="mr-0.5 h-2.5 w-2.5"
                              />{" "}
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle
                                weight="fill"
                                className="mr-0.5 h-2.5 w-2.5"
                              />{" "}
                              Inactivo
                            </>
                          )}
                        </Badge>
                        {lottery.playsTomorrow && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 h-4 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50"
                          >
                            Juega Mañana
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {!lottery.id.startsWith("lola-") && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors cursor-pointer"
                        onClick={() => handleEditLottery(lottery)}
                        title="Editar"
                      >
                        <PencilSimpleLine className="h-4 w-4" />
                      </button>
                      <button
                        className="h-7 w-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                        onClick={() => handleDeleteClick(lottery)}
                        title="Eliminar"
                      >
                        <X className="h-4 w-4" weight="bold" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Info de la card */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <SunHorizon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Abre:{" "}
                      <span className="font-medium text-foreground">
                        {lottery.openingTime}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Moon className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Cierra:{" "}
                      <span className="font-medium text-foreground">
                        {lottery.closingTime}
                      </span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Jugada:{" "}
                      <span className="font-medium text-foreground">
                        {lottery.drawTime}
                      </span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <LotteryDialog
        open={lotteryDialogOpen}
        onOpenChange={(open) => {
          setLotteryDialogOpen(open);
          if (!open) setEditingLottery(undefined);
        }}
        lottery={editingLottery}
        onSave={handleSaveLottery}
      />

      {/* Diálogo de confirmación para eliminar */}
      <Dialog
        open={deleteLotteryDialogOpen}
        onOpenChange={setDeleteLotteryDialogOpen}
      >
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                <Warning className="h-6 w-6 text-destructive" weight="fill" />
              </div>
              <div>
                <DialogTitle>Eliminar Sorteo</DialogTitle>
                <DialogDescription>
                  Esta acción no se puede deshacer
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              ¿Está seguro que desea eliminar el sorteo{" "}
              <span className="font-semibold text-foreground">
                "{lotteryToDelete?.name}"
              </span>
              ?
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteLotteryDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteLottery}
              disabled={isDeleting}
            >
              {isDeleting ? "Eliminando..." : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
