import { publicApi } from "@/integrations/backend/client";

export const validatePasswordResetToken = async (token: string) => {
  try {
    const response = await publicApi.get(`/password/reset/${token}/`);
    return response.data;
  } catch (error: any) {
    return error.response?.data || { valid: false, error: "Token inválido" };
  }
};