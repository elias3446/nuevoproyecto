import React, { useState, useEffect } from "react";
import { 
  X, Download, FileText, File as FileIcon, 
  Image as ImageIcon, Video, AlertCircle, Loader2,
  ExternalLink, ZoomIn, ZoomOut
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FilePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string | null | undefined;
  fileName?: string;
  fileType?: string;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  isOpen,
  onClose,
  fileUrl,
  fileName = "Archivo",
  fileType,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [zoom, setZoom] = useState(1);

  const [activeType, setActiveType] = useState<string>('unknown');

  useEffect(() => {
    const detectType = async () => {
      if (!isOpen || !fileUrl) return;
      
      setLoading(true);
      setError(false);
      setZoom(1);

      if (fileType) {
        setActiveType(fileType);
        setLoading(false);
        return;
      }

      if (fileUrl.startsWith('data:')) {
        const mime = fileUrl.split(':')[1].split(';')[0];
        setActiveType(mime.includes('image') ? 'image' : mime.includes('video') ? 'video' : mime.includes('pdf') ? 'pdf' : 'unknown');
        setLoading(false);
        return;
      }

      if (fileUrl.startsWith('blob:')) {
        try {
          const response = await fetch(fileUrl);
          const blob = await response.blob();
          const mime = blob.type;
          setActiveType(mime.includes('image') ? 'image' : mime.includes('video') ? 'video' : mime.includes('pdf') ? 'pdf' : 'unknown');
        } catch (e) {
          setActiveType('unknown');
        }
        setLoading(false);
        return;
      }

      const extension = fileUrl.split('.').pop()?.split('?')[0].toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension || '')) setActiveType('image');
      else if (['mp4', 'webm', 'ogg'].includes(extension || '')) setActiveType('video');
      else if (['pdf'].includes(extension || '')) setActiveType('pdf');
      else if (['txt', 'md', 'json'].includes(extension || '')) setActiveType('text');
      else setActiveType('unknown');
      
      setLoading(false);
    };

    detectType();
  }, [fileUrl, isOpen, fileType]);

  if (!fileUrl) return null;

  const type = activeType;

  const handleDownload = async () => {
    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      
      // Mapeo de tipos comunes para asegurar extensiones amigables
      const mimeMap: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'application/pdf': 'pdf',
        'video/mp4': 'mp4'
      };

      const extension = mimeMap[blob.type] || blob.type.split('/')[1] || 'jpg';
      
      // Limpiar el nombre de puntos extra que puedan confundir al SO
      const cleanBaseName = fileName.split('@')[0].replace(/\./g, '_');
      const fullFileName = `${cleanBaseName}.${extension}`;
      
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fullFileName;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error en descarga:", err);
      window.open(fileUrl, '_blank');
    }
  };

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center p-12 text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mb-4 opacity-50" />
          <h3 className="text-xl font-semibold text-white mb-2">Error al cargar archivo</h3>
          <p className="text-gray-400 mb-6">No pudimos obtener el archivo solicitado.</p>
          <Button onClick={handleDownload} variant="outline" className="border-gray-700">
            <Download className="mr-2 h-4 w-4" /> Intentar descargar directamente
          </Button>
        </div>
      );
    }

    switch (type) {
      case 'image':
        return (
          <div className="relative w-full h-full flex items-center justify-center overflow-hidden group">
            <img 
              src={fileUrl} 
              alt={fileName} 
              style={{ transform: `scale(${zoom})` }}
              className="max-w-full max-h-[75vh] object-contain transition-transform duration-300 ease-out shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-sm"
              onLoad={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
            
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <Button size="icon" variant="ghost" onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} className="h-8 w-8 text-white hover:bg-white/20 rounded-full">
                <ZoomOut size={16} />
              </Button>
              <div className="px-2 text-[10px] font-medium text-white/70 min-w-[40px] text-center">
                {Math.round(zoom * 100)}%
              </div>
              <Button size="icon" variant="ghost" onClick={() => setZoom(prev => Math.min(3, prev + 0.25))} className="h-8 w-8 text-white hover:bg-white/20 rounded-full">
                <ZoomIn size={16} />
              </Button>
            </div>
          </div>
        );
      
      case 'video':
        return (
          <div className="w-full flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-2xl overflow-hidden shadow-2xl">
            <video 
              src={fileUrl} 
              controls 
              className="max-w-full max-h-[75vh] outline-none"
              onLoadedMetadata={() => setLoading(false)}
              onError={() => { setLoading(false); setError(true); }}
            />
          </div>
        );

      case 'pdf':
        return (
          <div className="w-full h-[75vh] rounded-xl overflow-hidden border border-white/10 bg-white shadow-2xl">
            <iframe 
              src={`${fileUrl}#toolbar=0`} 
              className="w-full h-full"
              onLoad={() => setLoading(false)}
            />
          </div>
        );

      default:
        return (
          <div className="flex flex-col items-center justify-center p-16 text-center bg-white/5 backdrop-blur-md rounded-[2rem] border border-white/10">
            <div className="h-24 w-24 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center mb-6 text-blue-400">
              <FileIcon size={48} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3">{fileName}</h3>
            <p className="text-gray-400 mb-8 text-sm max-w-xs leading-relaxed">
              No podemos mostrar una vista previa de este formato todavía, pero puedes descargarlo para verlo en tu equipo.
            </p>
            <Button onClick={handleDownload} className="bg-blue-600 hover:bg-blue-500 px-8 py-6 rounded-2xl text-lg font-semibold shadow-xl shadow-blue-600/20">
              <Download className="mr-2 h-5 w-5" /> Descargar ahora
            </Button>
          </div>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl w-[98vw] bg-gray-950/95 backdrop-blur-xl border-white/5 text-white p-0 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,1)] rounded-[2rem] hide-close-button">
        <DialogHeader className="px-8 py-6 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="p-3 bg-white/5 rounded-2xl text-blue-400 shrink-0 border border-white/10">
              {type === 'image' && <ImageIcon size={22} />}
              {type === 'video' && <Video size={22} />}
              {type === 'pdf' && <FileText size={22} />}
              {type === 'unknown' && <FileIcon size={22} />}
            </div>
            <div className="flex flex-col overflow-hidden">
              <DialogTitle className="text-lg font-bold truncate text-white leading-tight">
                {fileName.replace(/_/g, ' ')}
              </DialogTitle>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Vista previa de archivo</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDownload}
              className="text-gray-400 hover:text-white hover:bg-white/10 h-11 w-11 rounded-2xl transition-all"
              title="Descargar"
            >
              <Download size={20} />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => window.open(fileUrl, '_blank')}
              className="text-gray-400 hover:text-white hover:bg-white/10 h-11 w-11 rounded-2xl transition-all"
              title="Expandir"
            >
              <ExternalLink size={20} />
            </Button>
            <div className="w-px h-6 bg-white/10 mx-1" />
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onClose}
              className="text-gray-400 hover:text-red-400 hover:bg-red-500/10 h-11 w-11 rounded-2xl transition-all"
            >
              <X size={20} />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative min-h-[400px] max-h-[80vh] flex items-center justify-center p-8 bg-gradient-to-b from-transparent to-black/20">
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full border-t-2 border-blue-500 animate-spin" />
                  <div className="absolute inset-0 h-16 w-16 rounded-full border-2 border-blue-500/10" />
                </div>
                <span className="text-xs font-bold text-blue-400/50 uppercase tracking-[0.2em]">Cargando</span>
              </div>
            </div>
          )}
          
          <div className="w-full h-full flex items-center justify-center">
            {renderContent()}
          </div>
        </div>

        <div className="px-8 py-4 bg-black/40 flex justify-end items-center">
          <p className="text-[10px] text-white/20 font-medium italic">
            El archivo se visualiza en alta resolución
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};
