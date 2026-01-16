import { useMemo, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const PLACEHOLDER_ANIMAL_IMAGE =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
      <rect x="2" y="2" width="124" height="124" rx="10" ry="10" fill="none" stroke="black" stroke-width="4"/>
      <circle cx="44" cy="46" r="10" fill="none" stroke="black" stroke-width="4"/>
      <path d="M18 96 L52 62 L74 84 L96 56 L114 96" fill="none" stroke="black" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`
  );

const normalizeLolaNumero = (numero: string) => {
  const cleaned = (numero || "").trim();
  const digitsOnly = cleaned.replace(/\D+/g, "");
  if (!digitsOnly) return "";
  const parsed = Number.parseInt(digitsOnly, 10);
  if (Number.isNaN(parsed)) return "";
  const normalized = ((parsed % 100) + 100) % 100;
  return String(normalized).padStart(2, "0");
};

const parseAmountNumber = (raw: string) => {
  const s = String(raw ?? "").trim();
  if (!s) return 0;

  // Remove currency symbols/spaces; keep digits and separators
  const cleaned = s.replace(/[^0-9.,-]/g, "");

  // Heuristic: if has both '.' and ',', treat '.' as thousands and ',' as decimals
  let normalized = cleaned;
  if (cleaned.includes(".") && cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(/,/g, ".");
  } else if (cleaned.includes(",")) {
    normalized = cleaned.replace(/,/g, ".");
  }

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
};

const formatAmount = (n: number) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: 2 }).format(n);

const getLolaAnimalImageSrc = (numero: string) => {
  const number = Number.parseInt(numero, 10);
  // const normalized = normalizeLolaNumero(numero);
  // if (!normalized) return PLACEHOLDER_ANIMAL_IMAGE;
  return `/assets/lola/${number}.png`;
};

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
  const [lotteryTab, setLotteryTab] = useState<"mikaela" | "lola">("mikaela");

  const [lolaMatrixDialogOpen, setLolaMatrixDialogOpen] = useState(false);
  const [selectedLolaLottery, setSelectedLolaLottery] =
    useState<Lottery | null>(null);

  const parseMatrizItem = (raw: string) => {
    const cleaned = (raw || "").trim().replace(/^\(/, "").replace(/\)$/, "");
    const parts = cleaned.split(",").map((p) => p.trim());
    const numero = normalizeLolaNumero(parts[0] ?? "");
    return {
      numero,
      monto: parts[1] ?? "",
      comprados: parts[2] ?? "",
      valor4: parts[3] ?? "",
      valor5: parts[4] ?? "",
    };
  };

  const lolaMontoByNumero = useMemo(() => {
    const map = new Map<string, number>();
    const matriz = selectedLolaLottery?.matriz ?? [];
    for (const raw of matriz) {
      const row = parseMatrizItem(raw);
      if (!row.numero) continue;
      map.set(row.numero, parseAmountNumber(row.monto));
    }
    return map;
  }, [selectedLolaLottery?.id, selectedLolaLottery?.matriz]);

  const openLolaMatrix = (lottery: Lottery) => {
    setSelectedLolaLottery(lottery);
    setLolaMatrixDialogOpen(true);
  };

  const isLolaLottery = (lottery: Lottery) => lottery.id.startsWith("lola-");

  const tabLotteries = lotteries.filter((l) =>
    lotteryTab === "lola" ? isLolaLottery(l) : !isLolaLottery(l)
  );

  // Filtrar y ordenar alfabéticamente por nombre
  const filteredLotteries = filterLotteries(tabLotteries, search, {
    isActive: statusFilter === "all" ? undefined : statusFilter === "active",
  }).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );

  const activeCount = tabLotteries.filter((l) => l.isActive).length;
  const inactiveCount = tabLotteries.filter((l) => !l.isActive).length;

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

      {/* Tabs: Mikaela / Lola */}
      <Tabs value={lotteryTab} onValueChange={(v) => setLotteryTab(v as any)}>
        <TabsList>
          <TabsTrigger value="mikaela" className="cursor-pointer">
            Mikaela
          </TabsTrigger>
          <TabsTrigger value="lola" className="cursor-pointer">
            Lola
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mikaela" className="mt-0" />
        <TabsContent value="lola" className="mt-0" />
      </Tabs>

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
            Todos ({tabLotteries.length})
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
          {filteredLotteries.map((lottery) => {
            const isLola = isLolaLottery(lottery);
            return (
              <Card
                key={lottery.id}
                className={`group relative overflow-hidden hover:shadow-lg transition-all duration-300 border-l-4 ${
                  isLola ? "cursor-pointer" : ""
                }`}
                style={{
                  borderLeftColor: lottery.isActive
                    ? "rgb(16 185 129)"
                    : "rgb(156 163 175)",
                }}
                onClick={isLola ? () => openLolaMatrix(lottery) : undefined}
                role={isLola ? "button" : undefined}
                tabIndex={isLola ? 0 : undefined}
                onKeyDown={
                  isLola
                    ? (e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          openLolaMatrix(lottery);
                        }
                      }
                    : undefined
                }
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
                        <Calendar
                          className="h-4 w-4 text-white"
                          weight="fill"
                        />
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
                    {!isLola && (
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
            );
          })}
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

      {/* Diálogo para visualizar matriz de loterías Lola */}
      <Dialog
        open={lolaMatrixDialogOpen}
        onOpenChange={(open) => {
          setLolaMatrixDialogOpen(open);
          if (!open) setSelectedLolaLottery(null);
        }}
      >
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>
              Números
              {selectedLolaLottery?.name
                ? ` — ${selectedLolaLottery.name}`
                : ""}
            </DialogTitle>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-auto rounded-md border p-2">
            {selectedLolaLottery?.matriz &&
            selectedLolaLottery.matriz.length > 0 ? (
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                {selectedLolaLottery.matriz.map((raw, idx) => {
                  const row = parseMatrizItem(raw);
                  const currentNumero = row.numero;
                  const currentMonto = parseAmountNumber(row.monto);

                  const n = currentNumero
                    ? Number.parseInt(currentNumero, 10)
                    : NaN;
                  const prevNumero = Number.isFinite(n)
                    ? String((n + 99) % 100).padStart(2, "0")
                    : "";
                  const nextNumero = Number.isFinite(n)
                    ? String((n + 1) % 100).padStart(2, "0")
                    : "";

                  const prevMonto = prevNumero
                    ? lolaMontoByNumero.get(prevNumero) ?? 0
                    : 0;
                  const nextMonto = nextNumero
                    ? lolaMontoByNumero.get(nextNumero) ?? 0
                    : 0;

                  const multiplicador70 = currentMonto * 70;
                  const multiplicador5 = prevMonto * 5 + nextMonto * 5;
                  const total = multiplicador70 + multiplicador5;

                  return (
                    <Card key={`${selectedLolaLottery.id}-${idx}`}>
                      <CardContent className="p-2">
                        <div className="flex items-start gap-2">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-muted">
                            <img
                              src={getLolaAnimalImageSrc(row.numero)}
                              alt={`Animalito ${row.numero}`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (img.dataset.fallbackApplied === "1") return;
                                img.dataset.fallbackApplied = "1";
                                img.src = PLACEHOLDER_ANIMAL_IMAGE;
                              }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-semibold leading-tight">
                              N° {row.numero}
                            </div>
                            <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                              <div>
                                Monto:{" "}
                                <span className="font-medium text-foreground">
                                  {row.monto}
                                </span>
                              </div>
                              <div>
                                Comprados:{" "}
                                <span className="font-medium text-foreground">
                                  {row.comprados}
                                </span>
                              </div>
                              <div>
                                Multiplicador x70:{" "}
                                <span className="font-medium text-foreground">
                                  {formatAmount(multiplicador70)}
                                </span>
                              </div>
                              <div>
                                Multiplicador x5:{" "}
                                <span className="font-medium text-foreground">
                                  {formatAmount(multiplicador5)}
                                </span>
                              </div>
                              <div>
                                Total:{" "}
                                <span className="font-medium text-foreground">
                                  {formatAmount(total)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">
                Esta lotería Lola no tiene matriz disponible
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setLolaMatrixDialogOpen(false)}
            >
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
