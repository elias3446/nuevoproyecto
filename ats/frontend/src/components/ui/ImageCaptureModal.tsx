import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, X, Check, RefreshCw, Smartphone } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ImageCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
  title?: string;
}

export const ImageCaptureModal: React.FC<ImageCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = "Capturar Imagen",
}) => {
  const [mode, setMode] = useState<"select" | "camera" | "preview">("select");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Sincronizar el stream con el elemento video cuando el modo cambia a camera
  useEffect(() => {
    if (mode === "camera" && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(err => console.error("Error al reproducir video:", err));
    }
  }, [mode, stream]);

  // Detectar si es móvil para priorizar cámara nativa
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android|iphone|ipad|ipod/i.test(userAgent.toLowerCase())) {
      setIsMobile(true);
    }
  }, []);

  // Manejar el inicio de la cámara (WebRTC)
  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: "user", 
          width: { ideal: 640 }, 
          height: { ideal: 640 } 
        },
        audio: false,
      });
      setStream(mediaStream);
      setMode("camera");
    } catch (err) {
      console.error("Error accediendo a la cámara:", err);
      fileInputRef.current?.click();
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleClose = () => {
    stopCamera();
    setMode("select");
    setPreviewUrl(null);
    onClose();
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        // Hacer el canvas cuadrado basado en el video
        const size = Math.min(video.videoWidth, video.videoHeight);
        canvas.width = size;
        canvas.height = size;

        const startX = (video.videoWidth - size) / 2;
        const startY = (video.videoHeight - size) / 2;

        context.drawImage(video, startX, startY, size, size, 0, 0, size, size);
        
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        setPreviewUrl(dataUrl);
        setMode("preview");
        stopCamera();
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setMode("preview");
    }
  };

  const handleConfirm = () => {
    if (previewUrl) {
      fetch(previewUrl)
        .then((res) => res.blob())
        .then((blob) => {
          const file = new File([blob], "avatar_capture.jpg", { type: "image/jpeg" });
          onCapture(file);
          handleClose();
        });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800 text-white p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-gray-800 bg-gray-900/50">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {mode === "camera" ? <Camera className="text-blue-400" /> : <Smartphone className="text-blue-400" />}
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="relative min-h-[300px] flex flex-col items-center justify-center p-6 bg-gray-950/50">
          
          {mode === "select" && (
            <div className="flex flex-col gap-4 w-full">
              <Button 
                onClick={isMobile ? () => cameraInputRef.current?.click() : startCamera}
                className="h-24 flex-col gap-2 bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-900/20"
              >
                <Camera size={32} />
                <span>Usar Cámara</span>
              </Button>
              
              <Button 
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-24 flex-col gap-2 border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-300"
              >
                <Upload size={32} />
                <span>Subir Archivo</span>
              </Button>
            </div>
          )}

          {mode === "camera" && (
            <div className="relative w-full aspect-square max-w-[320px] rounded-2xl overflow-hidden border-2 border-blue-500/30 shadow-2xl bg-black">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted
                className="w-full h-full object-cover mirror"
                onLoadedMetadata={() => videoRef.current?.play()}
              />
              <div className="absolute inset-0 border-[60px] border-gray-900/40 rounded-full pointer-events-none" />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                <button 
                  onClick={capturePhoto}
                  className="w-14 h-14 bg-white rounded-full border-4 border-gray-400/50 flex items-center justify-center shadow-xl hover:scale-105 transition-transform"
                >
                  <div className="w-10 h-10 bg-white border-2 border-gray-900 rounded-full" />
                </button>
              </div>
            </div>
          )}

          {mode === "preview" && previewUrl && (
            <div className="flex flex-col items-center gap-6 w-full">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-500/50 shadow-2xl shadow-blue-500/10">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
              
              <div className="flex gap-3 w-full">
                <Button 
                  onClick={() => setMode("select")}
                  variant="ghost" 
                  className="flex-1 text-gray-400 hover:text-white"
                >
                  <RefreshCw size={18} className="mr-2" /> Reintentar
                </Button>
                <Button 
                  onClick={handleConfirm}
                  className="flex-1 bg-green-600 hover:bg-green-500"
                >
                  <Check size={18} className="mr-2" /> Confirmar
                </Button>
              </div>
            </div>
          )}

          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileSelect}
          />
          <input 
            type="file" 
            ref={cameraInputRef} 
            className="hidden" 
            accept="image/*" 
            capture="user"
            onChange={handleFileSelect}
          />
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="p-4 bg-gray-900/80 text-center">
          <button onClick={handleClose} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Cancelar y cerrar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
