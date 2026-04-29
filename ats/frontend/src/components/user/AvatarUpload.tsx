import React, { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { toast } from "sonner";
import type { User } from "@/integrations/backend/types";
import { api } from "@/integrations/backend/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { ImageCaptureModal } from "@/components/ui/ImageCaptureModal";
import { FilePreviewModal } from "@/components/ui/FilePreviewModal";

interface AvatarUploadProps {
  currentAvatarUrl?: string;
  userName?: string;
  user?: User;
  onAvatarChange?: (url: string | null) => void;
}

export const AvatarUpload = ({ 
  currentAvatarUrl, 
  userName = "U",
  user,
  onAvatarChange 
}: AvatarUploadProps) => {
  const { uploading, uploadAvatar, removeAvatar } = useAvatarUpload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCaptureModalOpen, setIsCaptureModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const handleCapture = async (file: File) => {
    // ... (lógica de captura se mantiene igual)
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    const resultUrl = await uploadAvatar(file);
    if (resultUrl) {
      if (onAvatarChange) onAvatarChange(resultUrl);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemove = async () => {
    // ... (lógica de eliminación se mantiene igual)
    try {
      await api.patch('/me/', { avatar_url: null });
      removeAvatar();
      setPreviewUrl(null);
      if (onAvatarChange) onAvatarChange(null);
      
      queryClient.setQueryData(['profile'], (oldData: any) => {
        if (!oldData) return oldData;
        const newMetaData = { ...oldData.raw_user_meta_data };
        delete newMetaData.avatar_url;
        return {
          ...oldData,
          raw_user_meta_data: newMetaData
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      toast.success("Avatar eliminado");
    } catch (error) {
      toast.error("Error al eliminar avatar");
    }
  };

  const displayUrl = previewUrl || currentAvatarUrl || user?.raw_user_meta_data?.avatar_url;

  return (
    <div className="flex flex-col items-center">
      <div className="relative group">
        {/* Avatar Interactivo (Clic para Previsualizar) */}
        <div 
          onClick={() => displayUrl && setIsPreviewModalOpen(true)}
          className={cn(
            "cursor-pointer transition-transform duration-300 active:scale-95",
            displayUrl ? "hover:scale-[1.02]" : "cursor-default"
          )}
        >
          <Avatar className="avatar-circle-lg">
            <AvatarImage src={displayUrl} alt="Avatar" className="aspect-square object-cover rounded-full" />
            <AvatarFallback className="avatar-fallback-custom">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
        
        {/* Overlay de carga */}
        {uploading && (
          <div className="avatar-loading-full">
            <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
          </div>
        )}
        
        {/* Botón de cámara */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsCaptureModalOpen(true);
          }}
          disabled={uploading}
          className="avatar-badge"
          title="Cambiar avatar"
        >
          <Camera size={18} />
        </button>
      </div>

      <ImageCaptureModal 
        isOpen={isCaptureModalOpen}
        onClose={() => setIsCaptureModalOpen(false)}
        onCapture={handleCapture}
        title="Actualizar Foto de Perfil"
      />

      <FilePreviewModal 
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        fileUrl={displayUrl}
        fileName={`Avatar_${userName}`}
      />

      <p className="text-[11px] text-gray-500 mt-3 text-center leading-relaxed">
        JPG, PNG o GIF<br/>Máximo 5MB
      </p>

      {displayUrl && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
          className="avatar-delete-btn"
        >
          <X size={10} />
          Eliminar imagen
        </button>
      )}
    </div>
  );
};
