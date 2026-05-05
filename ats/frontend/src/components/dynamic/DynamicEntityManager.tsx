import React, { useState } from 'react';
import { useDynamicEntities, DynamicData } from '@/hooks/useDynamicEntities';
import { MasterDetailManager, MasterDetailConfig } from '@/components/ui/MasterDetailManager';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

interface DynamicEntityManagerProps {
  entityId: string;
}

export const DynamicEntityManager: React.FC<DynamicEntityManagerProps> = ({ entityId }) => {
  const { schema, data, isLoading, saveData, isSaving } = useDynamicEntities(entityId);
  const [editingRecord, setEditingRecord] = useState<Partial<DynamicData> | null>(null);

  if (isLoading || !schema) return <div className="p-8 text-center text-gray-500">Cargando datos...</div>;

  const config: MasterDetailConfig<DynamicData> = {
    entityName: schema.label,
    searchPlaceholder: `Buscar en ${schema.label}...`,
    filterFn: (record, term) => {
      return Object.values(record.data).some(val => 
        String(val).toLowerCase().includes(term.toLowerCase())
      );
    },
    list: {
      getKey: (r) => r.id,
      renderItem: (r, isActive) => (
        <div className="list-item-content">
          <div className="list-item-header">
            {/* Mostrar el primer campo del esquema como título principal */}
            <span className={`list-item-title ${isActive ? 'active' : ''}`}>
              {String(Object.values(r.data)[0] || 'Sin nombre')}
            </span>
          </div>
          <div className="flex gap-2 mt-1">
             {schema.fields.slice(1, 3).map(f => (
               <span key={f.name} className="text-[10px] text-gray-500 bg-[#0f1219] px-1.5 py-0.5 rounded">
                 {f.label}: {String(r.data[f.name] || '-')}
               </span>
             ))}
          </div>
        </div>
      ),
    },
    editor: {
      title: (r) => r?.id ? `Editar ${schema.label}` : `Nuevo ${schema.label}`,
      description: (r) => r?.id ? `Modifica los datos de este registro.` : `Llena los campos para crear un nuevo registro.`,
      onSave: async () => {
        await saveData({ 
          id: editingRecord?.id, 
          entity: schema.id, 
          data: editingRecord?.data || {} 
        });
        setEditingRecord(null);
      },
      onCancel: () => setEditingRecord(null),
      renderFields: (r) => (
        <div className="space-y-4">
          {schema.fields.map(field => (
            <div key={field.name} className="form-field">
              <label className="form-label-sm">{field.label} {field.is_required && '*'}</label>
              
              {field.field_type === 'text' && (
                <Input 
                  value={editingRecord?.data?.[field.name] || ''}
                  onChange={e => setEditingRecord({
                    ...editingRecord,
                    data: { ...(editingRecord?.data || {}), [field.name]: e.target.value }
                  })}
                  className="form-input-dark"
                />
              )}

              {field.field_type === 'textarea' && (
                <textarea 
                  value={editingRecord?.data?.[field.name] || ''}
                  onChange={e => setEditingRecord({
                    ...editingRecord,
                    data: { ...(editingRecord?.data || {}), [field.name]: e.target.value }
                  })}
                  className="form-input-dark w-full min-h-[100px] p-2 text-sm"
                />
              )}

              {field.field_type === 'number' && (
                <Input 
                  type="number"
                  value={editingRecord?.data?.[field.name] || ''}
                  onChange={e => setEditingRecord({
                    ...editingRecord,
                    data: { ...(editingRecord?.data || {}), [field.name]: e.target.value }
                  })}
                  className="form-input-dark"
                />
              )}

              {field.field_type === 'date' && (
                <Input 
                  type="date"
                  value={editingRecord?.data?.[field.name] || ''}
                  onChange={e => setEditingRecord({
                    ...editingRecord,
                    data: { ...(editingRecord?.data || {}), [field.name]: e.target.value }
                  })}
                  className="form-input-dark"
                />
              )}

              {field.field_type === 'boolean' && (
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox 
                    checked={editingRecord?.data?.[field.name] || false}
                    onCheckedChange={checked => setEditingRecord({
                      ...editingRecord,
                      data: { ...(editingRecord?.data || {}), [field.name]: !!checked }
                    })}
                  />
                  <span className="text-sm text-gray-400">Activo / Seleccionado</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )
    }
  };

  return (
    <div className="h-full">
      <MasterDetailManager<DynamicData>
        data={data}
        totalCount={data.length}
        page={1}
        setPage={() => {}}
        isLoading={isLoading}
        isSaving={isSaving}
        searchTerm=""
        onSearchChange={() => {}}
        selectedItem={editingRecord}
        onSelectItem={setEditingRecord}
        onAddNew={() => setEditingRecord({ data: {} })}
        config={config}
      />
    </div>
  );
};
