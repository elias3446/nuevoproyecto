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
      let finalFileId = data.id;

      // Si la subida es asíncrona, esperar a que se complete
      if (data.upload_id) {
        let attempts = 0;
        const maxAttempts = 30; // 30 segundos máximo
        
        while (attempts < maxAttempts) {
          const statusRes = await api.get(`/storage/upload/status/${data.upload_id}/`);
          const statusData = statusRes.data;
          
          if (statusData.status === 'COMPLETED') {
            finalFileId = statusData.metadata.storage_object_id;
            break;
          } else if (statusData.status === 'FAILED') {
            throw new Error(statusData.error_message || "La subida falló en el servidor");
          }
          
          // Esperar 1 segundo antes del próximo intento
          await new Promise(resolve => setTimeout(resolve, 1000));
          attempts++;
        }

        if (!finalFileId) {
          throw new Error("Tiempo de espera agotado al procesar la imagen");
        }
      }

      if (!finalFileId) {
        throw new Error("No se recibió un ID de archivo válido");
      }
      
      // Obtener los detalles del archivo para conseguir la URL de descarga real (media url)
      const fileDetailRes = await api.get(`/storage/files/${finalFileId}/`);
      const downloadUrl = fileDetailRes.data.download_url;

      if (!downloadUrl) {
        throw new Error("No se pudo obtener la URL de descarga de la imagen");
      }

      // Actualizar perfil del usuario con la URL de descarga real
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
