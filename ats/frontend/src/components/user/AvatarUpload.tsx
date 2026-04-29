import React, { useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { useAvatarUpload } from "@/hooks/useAvatarUpload";
import { toast } from "sonner";
import type { User } from "@/integrations/backend/types";
import { api } from "@/integrations/backend/client";
import { useQueryClient } from "@tanstack/react-query";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploading, uploadAvatar, removeAvatar } = useAvatarUpload();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Mostrar preview local
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    // Subir al servidor
    const resultUrl = await uploadAvatar(file);
    if (resultUrl) {
      if (onAvatarChange) onAvatarChange(resultUrl);
    } else {
      setPreviewUrl(null);
    }

    // Limpiar input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const queryClient = useQueryClient();

  const handleRemove = async () => {
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
    <div className="avatar-upload-container">
      <div className="relative inline-block">
        <Avatar className="h-24 w-24 border-2 border-gray-600">
          <AvatarImage src={displayUrl} alt="Avatar" />
          <AvatarFallback className="text-2xl bg-gray-700 text-gray-300">
            {userName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        
        {/* Overlay de carga */}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
            <Loader2 className="h-6 w-6 animate-spin text-white" />
          </div>
        )}
        
        {/* Botón de cámara */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0 right-0 p-1.5 bg-blue-600 hover:bg-blue-700 rounded-full text-white shadow-lg transition-colors"
          title="Cambiar avatar"
        >
          <Camera size={14} />
        </button>
      </div>

      {/* Input file oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Botón eliminar */}
      {displayUrl && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleRemove}
          className="mt-3 text-red-400 border-red-400/30 hover:bg-red-400/10"
        >
          <X size={14} className="mr-1" />
          Eliminar
        </Button>
      )}
    </div>
  );
};
