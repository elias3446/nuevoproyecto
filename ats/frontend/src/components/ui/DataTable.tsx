import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Tipos públicos ────────────────────────────────────────────────────────────

/**
 * Definición de una columna para DataTable.
 *
 * @template T - Tipo del registro de datos.
 */
export interface ColumnDef<T> {
  /** Identificador único de la columna. */
  key: string;
  /** Texto de la cabecera. */
  header: string;
  /** Alineación del contenido (default: "left"). */
  align?: "left" | "right" | "center";
  /** Clase CSS adicional para la celda. */
  className?: string;
  /** Función que renderiza el contenido de la celda. */
  render: (row: T, index: number) => React.ReactNode;
}

/**
 * Props del componente DataTable.
 *
 * @template T - Tipo del registro de datos.
 */
export interface DataTableProps<T> {
  /** Definiciones de columnas. */
  columns: ColumnDef<T>[];
  /** Datos de la página actual. */
  data: T[];
  /** Indica si los datos están cargando. */
  isLoading?: boolean;
  /** Mensaje cuando no hay datos. */
  emptyMessage?: string;
  /** Clase CSS adicional para el contenedor raíz. */
  className?: string;

  // ── Paginación (opcional) ──────────────────────────────────────────────────
  /** Página actual (1-indexed). Si no se pasa, no se muestra la barra. */
  page?: number;
  /** Número total de páginas. */
  totalPages?: number;
  /** Callback cuando el usuario cambia de página. */
  onPageChange?: (page: number) => void;
  /** Total de registros (para mostrar en el footer). */
  totalCount?: number;
}

// ─── Helpers de paginación ────────────────────────────────────────────────────

function buildPageRange(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "...")[] = [1];

  if (current > 3) pages.push("...");

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);

  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("...");
  pages.push(total);

  return pages;
}

// ─── Componente principal ─────────────────────────────────────────────────────

/**
 * Tabla de datos genérica y reutilizable con soporte opcional de paginación.
 *
 * @example
 * <DataTable
 *   columns={columns}
 *   data={data}
 *   isLoading={isLoading}
 *   page={page}
 *   totalPages={totalPages}
 *   onPageChange={setPage}
 * />
 */
export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  emptyMessage = "No hay registros disponibles.",
  className,
  page,
  totalPages = 1,
  onPageChange,
  totalCount,
}: DataTableProps<T>) {
  const hasPagination =
    page !== undefined && onPageChange !== undefined && totalPages > 1;

  const pageRange = hasPagination ? buildPageRange(page, totalPages) : [];

  return (
    <div className={cn("space-y-3", className)}>
      {/* ── Tabla ── */}
      <div className="table-container">
        <Table>
          <TableHeader className="bg-gray-800/50">
            <TableRow className="table-header-row">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    col.align === "right"
                      ? "table-head-right"
                      : "table-head",
                    col.align === "center" && "text-center",
                    col.className
                  )}
                >
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="table-cell-empty"
                >
                  <Loader2 className="mx-auto w-5 h-5 animate-spin text-gray-500" />
                </TableCell>
              </TableRow>
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="table-cell-empty"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              data.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className="table-row"
                >
                  {columns.map((col) => (
                    <TableCell
                      key={col.key}
                      className={cn(
                        col.align === "right"
                          ? "text-right"
                          : col.align === "center"
                          ? "text-center"
                          : "",
                        col.className
                      )}
                    >
                      {col.render(row, rowIndex)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Footer: conteo + paginación ── */}
      {(hasPagination || totalCount !== undefined) && (
        <div className="flex items-center justify-between px-1">
          {/* Conteo */}
          <span className="text-xs text-gray-500">
            {totalCount !== undefined
              ? `${totalCount} registro${totalCount !== 1 ? "s" : ""} en total`
              : ""}
          </span>

          {/* Paginación */}
          {hasPagination && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) onPageChange(page - 1);
                    }}
                    className={cn(
                      page <= 1 && "pointer-events-none opacity-40"
                    )}
                  />
                </PaginationItem>

                {pageRange.map((p, i) =>
                  p === "..." ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={p}>
                      <PaginationLink
                        href="#"
                        isActive={p === page}
                        onClick={(e) => {
                          e.preventDefault();
                          onPageChange(p as number);
                        }}
                      >
                        {p}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}

                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) onPageChange(page + 1);
                    }}
                    className={cn(
                      page >= totalPages && "pointer-events-none opacity-40"
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </div>
      )}
    </div>
  );
}
