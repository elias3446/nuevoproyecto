import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { api } from "@/integrations/backend/client";

/**
 * Respuesta paginada estándar del backend (DRF PageNumberPagination).
 */
export interface PaginatedResponse<T> {
  count: number;
  num_pages: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * Opciones de configuración del hook.
 */
export interface UseServerTableOptions {
  /** Número de elementos por página (default: 10). */
  pageSize?: number;
  /**
   * Intervalo de refresco automático en ms.
   * Si se pasa una función, recibe los datos actuales y devuelve el intervalo o false.
   */
  refetchInterval?: number | false | ((data: any) => number | false);
  /** Query params adicionales a enviar en cada request. */
  extraParams?: Record<string, string | number | boolean>;
  /** Si se proporciona, sincroniza la página con este parámetro en la URL. */
  urlParam?: string;
  /** Si es true, el hook no realiza ninguna petición. */
  enabled?: boolean;
}

/**
 * Valor retornado por el hook.
 */
export interface UseServerTableReturn<T> {
  /** Registros de la página actual. */
  data: T[];
  /** Total de registros en el servidor. */
  totalCount: number;
  /** Número total de páginas. */
  totalPages: number;
  /** Página actual (1-indexed). */
  page: number;
  /** Navegar a una página específica. */
  setPage: (page: number) => void;
  /** Ir a la página anterior. */
  prevPage: () => void;
  /** Ir a la página siguiente. */
  nextPage: () => void;
  /** true mientras se carga la primera vez. */
  isLoading: boolean;
  /** true cuando se refresca en background. */
  isFetching: boolean;
  /** Error si la petición falló. */
  error: Error | null;
  /** Forzar un refresco inmediato. */
  refetch: () => void;
  /** Invalidar la query key desde fuera. */
  invalidate: () => void;
}

/**
 * Hook genérico para tablas paginadas con soporte de server-side pagination.
 *
 * @example
 * const { data, page, setPage, totalPages, isLoading } =
 *   useServerTable<ExportRecord>("/audit/exports/list/");
 */
export function useServerTable<T>(
  url: string,
  options: UseServerTableOptions = {}
): UseServerTableReturn<T> {
  const {
    pageSize = 10,
    refetchInterval,
    extraParams = {},
    enabled = true,
    urlParam,
  } = options;

  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Inicializar desde URL si existe
  const initialPage = urlParam ? parseInt(searchParams.get(urlParam) || "1") : 1;
  const [page, setPageState] = useState(initialPage);

  // Sincronizar estado local -> URL
  useEffect(() => {
    if (urlParam && page !== parseInt(searchParams.get(urlParam) || "0")) {
      setSearchParams(prev => {
        const next = new URLSearchParams(prev);
        if (page === 1) next.delete(urlParam);
        else next.set(urlParam, String(page));
        return next;
      }, { replace: true });
    }
  }, [page, urlParam, setSearchParams]);

  // Sincronizar URL -> estado local (para botones atrás/adelante del navegador)
  useEffect(() => {
    if (urlParam) {
      const urlPage = parseInt(searchParams.get(urlParam) || "1");
      if (urlPage !== page) setPageState(urlPage);
    }
  }, [searchParams, urlParam]);

  const queryKey = ["server-table", url, page, pageSize, extraParams];

  const { data: raw, isLoading, isFetching, error, refetch } = useQuery<
    PaginatedResponse<T>
  >({
    queryKey,
    enabled,
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        page_size: String(pageSize),
        ...Object.fromEntries(
          Object.entries(extraParams).map(([k, v]) => [k, String(v)])
        ),
      });
      const res = await api.get<PaginatedResponse<T>>(`${url}?${params}`);
      return res.data;
    },
    refetchInterval: refetchInterval as any,
    placeholderData: (prev) => prev, // mantiene datos anteriores mientras carga la página nueva
  });

  const setPage = useCallback(
    (p: number) => {
      const clamped = Math.max(1, Math.min(p, raw?.num_pages ?? 1));
      setPageState(clamped);
    },
    [raw?.num_pages]
  );

  const prevPage = useCallback(() => setPage(page - 1), [page, setPage]);
  const nextPage = useCallback(() => setPage(page + 1), [page, setPage]);

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["server-table", url] });
  }, [queryClient, url]);

  return {
    data: raw?.results ?? [],
    totalCount: raw?.count ?? 0,
    totalPages: raw?.num_pages ?? 1,
    page,
    setPage,
    prevPage,
    nextPage,
    isLoading,
    isFetching,
    error: error as Error | null,
    refetch,
    invalidate,
  };
}
