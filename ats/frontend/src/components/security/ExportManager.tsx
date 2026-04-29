import React from "react";
import { useExports, ExportRecord } from "@/hooks/useExports";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, FileText, Loader2, Plus } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export const ExportManager = () => {
  const { exports, isLoading, requestExport, isRequesting } = useExports();
  
  const [exportType, setExportType] = React.useState("AUDIT_LOGS");
  const [formatType, setFormatType] = React.useState("csv");

  const handleRequestExport = () => {
    requestExport({ export_type: exportType, format: formatType });
  };

  const getStatusBadge = (status: ExportRecord["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Completado</Badge>;
      case "PROCESSING":
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50 animate-pulse">
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Procesando
          </Badge>
        );
      case "PENDING":
        return <Badge variant="outline" className="text-gray-400">Pendiente</Badge>;
      case "FAILED":
        return <Badge variant="destructive">Fallido</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end gap-4 bg-gray-800/50 p-6 rounded-xl border border-gray-700">
        <div className="flex-1 space-y-2">
          <label className="text-sm font-medium text-gray-300">Tipo de Exportación</label>
          <Select value={exportType} onValueChange={setExportType}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Seleccionar tipo" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-white">
              <SelectItem value="AUDIT_LOGS">Logs de Auditoría</SelectItem>
              <SelectItem value="ACCESS_LOGS">Logs de Acceso</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-32 space-y-2">
          <label className="text-sm font-medium text-gray-300">Formato</label>
          <Select value={formatType} onValueChange={setFormatType}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white">
              <SelectValue placeholder="Formato" />
            </SelectTrigger>
            <SelectContent className="bg-gray-900 border-gray-700 text-white">
              <SelectItem value="csv">CSV</SelectItem>
              <SelectItem value="json">JSON</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={handleRequestExport} 
          disabled={isRequesting}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-900/20"
        >
          {isRequesting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Nueva Exportación
        </Button>
      </div>

      <div className="bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-800/50">
            <TableRow className="border-gray-800 hover:bg-transparent">
              <TableHead className="text-gray-400">Tipo</TableHead>
              <TableHead className="text-gray-400">Fecha</TableHead>
              <TableHead className="text-gray-400">Estado</TableHead>
              <TableHead className="text-gray-400">Registros</TableHead>
              <TableHead className="text-gray-400 text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                  Cargando exportaciones...
                </TableCell>
              </TableRow>
            ) : (!Array.isArray(exports) || exports.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-gray-500">
                  No hay exportaciones recientes.
                </TableCell>
              </TableRow>
            ) : (
              exports.map((exp) => (
                <TableRow key={exp.id} className="border-gray-800 hover:bg-gray-800/30 transition-colors">
                  <TableCell className="font-medium text-gray-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-blue-400" />
                      {exp.export_type === 'AUDIT_LOGS' ? 'Logs de Auditoría' : 'Logs de Acceso'}
                      <span className="text-xs text-gray-500 uppercase">({exp.format})</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {format(new Date(exp.created_at), "d 'de' MMMM, HH:mm", { locale: es })}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(exp.status)}
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {exp.record_count}
                  </TableCell>
                  <TableCell className="text-right">
                    {exp.status === 'COMPLETED' && exp.file_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
                      >
                        <a href={exp.file_url} target="_blank" rel="noopener noreferrer">
                          <Download className="w-4 h-4 mr-2" />
                          Descargar
                        </a>
                      </Button>
                    )}
                    {exp.status === 'FAILED' && (
                      <span className="text-xs text-red-400 italic" title={exp.error_message || ''}>
                        Error en proceso
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
