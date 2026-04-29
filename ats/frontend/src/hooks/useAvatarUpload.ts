import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/integrations/backend/client";
import type { FileUploadResponse } from "@/integrations/backend/types";

export const useAvatarUpload = () => {
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadAvatar = async (file: File): Promise<string | null> => {
    // Validar tipo de archivo (solo imágenes)
    if (!file.type.startsWith('image/')) {
      toast.error("Solo se permiten archivos de imagen");
      return null;
    }

    // Validar tamaño (máximo 5MB para avatars)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("La imagen no debe superar 5MB");
      return null;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket_id', 'user-avatars');
      formData.append('metadata', JSON.stringify({ 
        type: 'avatar',
        original_name: file.name 
      }));

      // Subir usando la API de storage
      const response = await api.post('/storage/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data: FileUploadResponse = response.data;
      
      // Actualizar perfil del usuario con la URL del avatar
      const downloadUrl = data.download_url || `${window.location.origin}/api/storage/files/${data.id}/`;
      await api.patch('/me/', {
        avatar_url: downloadUrl
      });

      queryClient.setQueryData(['profile'], (oldData: any) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          raw_user_meta_data: {
            ...oldData.raw_user_meta_data,
            avatar_url: downloadUrl
          }
        };
      });
      
      queryClient.invalidateQueries({ queryKey: ['profile'] });

      toast.success("Avatar actualizado correctamente");
      return downloadUrl;
    } catch (error: any) {
      const msg = error.response?.data?.detail || "Error al subir la imagen";
      toast.error(msg);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = () => {
    setPreviewUrl(null);
  };

  return {
    uploading,
    previewUrl,
    setPreviewUrl,
    uploadAvatar,
    removeAvatar,
  };
};
