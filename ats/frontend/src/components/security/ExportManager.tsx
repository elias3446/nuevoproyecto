import React from "react";
import { useExports, ExportRecord } from "@/hooks/useExports";
import { useServerTable } from "@/hooks/useServerTable";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Download, FileText, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

// ─── Helpers de presentación ──────────────────────────────────────────────────

const STATUS_LABEL: Record<ExportRecord["status"], string> = {
  COMPLETED:  "Completado",
  PROCESSING: "Procesando",
  PENDING:    "Pendiente",
  FAILED:     "Fallido",
};

function StatusBadge({ status }: { status: ExportRecord["status"] }) {
  if (status === "COMPLETED")
    return <Badge className="badge-completed">{STATUS_LABEL[status]}</Badge>;
  if (status === "PROCESSING")
    return (
      <Badge className="badge-processing">
        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  if (status === "PENDING")
    return <Badge variant="outline" className="badge-pending">{STATUS_LABEL[status]}</Badge>;
  return <Badge variant="destructive">{STATUS_LABEL[status]}</Badge>;
}

// ─── Definición de columnas ───────────────────────────────────────────────────

const EXPORT_COLUMNS: ColumnDef<ExportRecord>[] = [
  {
    key: "type",
    header: "Tipo",
    render: (exp) => (
      <div className="table-file-icon">
        <FileText className="table-file-icon-indicator" />
        {exp.export_type === "AUDIT_LOGS" ? "Logs de Auditoría" : "Logs de Acceso"}
        <span className="table-format-tag">({exp.format})</span>
      </div>
    ),
  },
  {
    key: "created_at",
    header: "Fecha",
    render: (exp) =>
      format(new Date(exp.created_at), "d 'de' MMMM, HH:mm", { locale: es }),
  },
  {
    key: "status",
    header: "Estado",
    render: (exp) => <StatusBadge status={exp.status} />,
  },
  {
    key: "record_count",
    header: "Registros",
    render: (exp) => (
      <span className="table-cell-secondary">{exp.record_count}</span>
    ),
  },
  {
    key: "action",
    header: "Acción",
    align: "right",
    render: (exp) => {
      if (exp.status === "COMPLETED" && exp.file_url)
        return (
          <Button variant="ghost" size="sm" asChild className="download-btn">
            <a href={exp.file_url} target="_blank" rel="noopener noreferrer">
              <Download className="w-4 h-4 mr-2" />
              Descargar
            </a>
          </Button>
        );
      if (exp.status === "FAILED")
        return (
          <span className="error-label" title={exp.error_message || ""}>
            Error en proceso
          </span>
        );
      return null;
    },
  },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export const ExportManager = () => {
  const { requestExport, isRequesting } = useExports();

  const [exportType, setExportType] = React.useState("AUDIT_LOGS");
  const [formatType, setFormatType]  = React.useState("csv");

  // Datos paginados desde el servidor, con auto-refresh cuando hay tareas activas
  const { data, isLoading, page, setPage, totalPages, totalCount } =
    useServerTable<ExportRecord>("/audit/exports/list/", {
      pageSize: 10,
      // En React Query v5, refetchInterval recibe el objeto Query completo
      refetchInterval: (query: any) => {
        const results: ExportRecord[] = query?.state?.data?.results ?? [];
        const hasActive = results.some(
          (e) => e.status === "PENDING" || e.status === "PROCESSING"
        );
        return hasActive ? 3000 : false;
      },
    });

  const handleRequestExport = () => {
    requestExport({ export_type: exportType, format: formatType });
  };

  return (
    <div className="space-y-6">
      {/* ── Panel de filtros y acción ── */}
      <div className="action-panel">
        <div className="action-panel-field">
          <label className="action-panel-label">Tipo de Exportación</label>
          <Select value={exportType} onValueChange={setExportType}>
            <SelectTrigger className="action-panel-select">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent className="action-panel-select">
              <SelectItem value="AUDIT_LOGS">Logs de Auditoría</SelectItem>
              <SelectItem value="ACCESS_LOGS">Logs de Acceso</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="action-panel-field-sm">
          <label className="action-panel-label">Formato</label>
          <Select value={formatType} onValueChange={setFormatType}>
            <SelectTrigger className="action-panel-select">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent className="action-panel-select">
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={handleRequestExport}
          disabled={isRequesting}
          className="action-panel-btn"
        >
          {isRequesting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Nueva Exportación
        </Button>
      </div>

      {/* ── Tabla genérica con paginación ── */}
      <DataTable<ExportRecord>
        columns={EXPORT_COLUMNS}
        data={data}
        isLoading={isLoading}
        emptyMessage="No hay exportaciones recientes."
        page={page}
        totalPages={totalPages}
        totalCount={totalCount}
        onPageChange={setPage}
      />
    </div>
  );
};
