import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Pagination, 
  PaginationContent, 
  PaginationEllipsis, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious 
} from "@/components/ui/pagination";
import { Search, ChevronRight, Settings2, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MasterDetailConfig<T> {
  entityName: string;
  searchPlaceholder?: string;
  filterFn?: (item: T, term: string) => boolean;
  list: {
    getKey: (item: T) => string | number;
    renderItem: (item: T, isActive: boolean) => React.ReactNode;
  };
  editor: {
    title: (item: Partial<T> | null) => string;
    description: (item: Partial<T> | null) => string;
    renderFields: (item: Partial<T>, onChange: (updated: Partial<T>) => void) => React.ReactNode;
    onSave: () => void;
    onCancel: () => void;
  };
}

export interface MasterDetailManagerProps<T> {
  data: T[];
  totalCount: number;
  pageSize?: number;
  page: number;
  setPage: (page: number) => void;
  isLoading: boolean;
  isSaving: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  selectedItem: Partial<T> | null;
  onSelectItem: (item: T) => void;
  onItemChange: (updated: Partial<T>) => void;
  onAddNew: () => void;
  config: MasterDetailConfig<T>;
  className?: string;
  emptyState?: React.ReactNode;
}

export function MasterDetailManager<T>({
  data,
  totalCount,
  pageSize = 20,
  page,
  setPage,
  isLoading,
  isSaving,
  searchTerm,
  onSearchChange,
  selectedItem,
  onSelectItem,
  onItemChange,
  onAddNew,
  config,
  className,
  emptyState
}: MasterDetailManagerProps<T>) {
  
  const totalPages = Math.ceil(totalCount / pageSize);

  // Apply filterFn if provided, otherwise show all data
  const filteredData = useMemo(() => {
    if (!config.filterFn || !searchTerm) return data;
    return data.filter(item => config.filterFn!(item, searchTerm));
  }, [data, searchTerm, config.filterFn]);

  // Helper de paginación idéntico a DataTable.tsx
  const pageRange = useMemo(() => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  }, [page, totalPages]);

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch animate-in fade-in slide-in-from-bottom-4 duration-700", className)}>
      {/* Master Sidebar - sticky con scroll interno */}
      <Card className="lg:col-span-4 bg-gray-900/40 border-gray-800 backdrop-blur-xl flex flex-col sticky top-0" style={{height: 'calc(100vh - 160px)'}}>
        <CardHeader className="pb-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <CardTitle className="text-xl text-white">{config.entityName}s</CardTitle>
            <Button 
              size="sm" 
              onClick={onAddNew}
              className="bg-blue-600 hover:bg-blue-700 h-8"
            >
              <Plus className="h-4 w-4 mr-1" /> Nuevo
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input 
              placeholder={config.searchPlaceholder || `Buscar ${config.entityName.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 bg-gray-800/50 border-gray-700 focus:ring-blue-500/20 h-9 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-4 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 min-h-0" style={{maxHeight: 'calc(100vh - 340px)'}}>
            <div className="space-y-2">
              {isLoading && page === 1 ? (
                <div className="flex items-center justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No se encontraron {config.entityName.toLowerCase()}s.
                </div>
              ) : (
                filteredData.map(item => {
                  const key = config.list.getKey(item);
                  const isActive = selectedItem && config.list.getKey(selectedItem as T) === key;
                  return (
                    <div 
                      key={key} 
                      onClick={() => onSelectItem(item)}
                      className={`group p-3 rounded-lg border transition-all cursor-pointer relative overflow-hidden ${
                        isActive 
                        ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/50' 
                        : 'bg-gray-800/30 border-gray-800 hover:border-gray-700 hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between relative z-10">
                        {config.list.renderItem(item, !!isActive)}
                        <ChevronRight className={`h-4 w-4 transition-transform ${isActive ? 'text-blue-500 translate-x-1' : 'text-gray-600 opacity-0 group-hover:opacity-100'}`} />
                      </div>
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="pt-4 border-t border-gray-800 shrink-0">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if(page > 1) setPage(page - 1); }}
                      className={page <= 1 ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    />
                  </PaginationItem>
                  
                  {pageRange.map((p, i) =>
                    p === "..." ? (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink 
                          href="#" 
                          isActive={p === page}
                          onClick={(e) => { e.preventDefault(); setPage(p as number); }}
                          className="cursor-pointer"
                        >
                          {p}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}

                  <PaginationItem>
                    <PaginationNext 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); if(page < totalPages) setPage(page + 1); }}
                      className={page >= totalPages ? "pointer-events-none opacity-40" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Editor Area */}
      <div className="lg:col-span-8 flex flex-col" style={{height: 'calc(100vh - 160px)'}}>
        {selectedItem ? (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 flex-1 min-h-0">
            <Card className="bg-gray-900 border-gray-800 overflow-hidden flex flex-col h-full">
              <CardHeader className="shrink-0 bg-gradient-to-r from-gray-800/50 to-transparent border-b border-gray-800">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600/20 rounded-xl">
                      <Settings2 className="text-blue-500 h-6 w-6" />
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">
                        {config.editor.title(selectedItem)}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        {config.editor.description(selectedItem)}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={config.editor.onCancel} className="border-gray-700 hover:bg-gray-800">
                      Cancelar
                    </Button>
                    <Button 
                      onClick={config.editor.onSave} 
                      disabled={isSaving} 
                      className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-900/20"
                    >
                      {isSaving ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 flex-1 overflow-y-auto">
                {config.editor.renderFields(selectedItem, onItemChange)}
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {emptyState || (
              <div className="empty-state-wrapper w-full" style={{height: 'calc(100vh - 160px)', minHeight: 'unset'}}>
                <div className="empty-state-content mx-auto">
                  <div className="empty-state-icon">
                    <Plus />
                  </div>
                  <div className="space-y-2">
                    <h3 className="empty-state-title">Gestión de {config.entityName}s</h3>
                    <p className="empty-state-desc">
                      Selecciona un {config.entityName.toLowerCase()} de la lista izquierda para editarlo o crea uno nuevo.
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="border-gray-800 text-gray-500 hover:text-white"
                    onClick={onAddNew}
                  >
                    <Plus className="h-4 w-4 mr-2" /> Crear {config.entityName}
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
