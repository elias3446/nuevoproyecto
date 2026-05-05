import React, { useState, useEffect } from 'react';
import { useDynamicEntities, DynamicField, FieldType } from '@/hooks/useDynamicEntities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, GripVertical, Save } from 'lucide-react';
import { Card } from '@/components/ui/card';

interface DynamicSchemaEditorProps {
  entityId: string;
  onSaved?: () => void;
}

export const DynamicSchemaEditor: React.FC<DynamicSchemaEditorProps> = ({ entityId, onSaved }) => {
  const { schema, syncFields, isSaving, isLoading } = useDynamicEntities(entityId);
  const [fields, setFields] = useState<DynamicField[]>([]);

  useEffect(() => {
    if (schema?.fields) {
      setFields(schema.fields);
    }
  }, [schema]);

  const addField = () => {
    const newField: DynamicField = {
      name: `campo_${fields.length + 1}`,
      label: `Nuevo Campo ${fields.length + 1}`,
      field_type: 'text',
      is_required: false,
      order: fields.length
    };
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updated: Partial<DynamicField>) => {
    const newFields = [...fields];
    newFields[index] = { ...newFields[index], ...updated };
    setFields(newFields);
  };

  const handleSave = async () => {
    await syncFields({ id: entityId, fields });
    if (onSaved) onSaved();
  };

  if (isLoading) return <div className="p-8 text-center text-gray-500">Cargando esquema...</div>;

  return (
    <div className="space-y-6 p-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold text-white">Estructura de la Tabla</h3>
          <p className="text-sm text-gray-400">Define las columnas que tendrá este módulo.</p>
        </div>
        <Button onClick={addField} variant="outline" size="sm" className="gap-2">
          <Plus className="w-4 h-4" /> Añadir Columna
        </Button>
      </div>

      <div className="space-y-3">
        {fields.length === 0 && (
          <div className="border-2 border-dashed border-gray-800 rounded-lg p-8 text-center text-gray-600">
            No hay campos definidos. Haz clic en "Añadir Columna" para empezar.
          </div>
        )}
        
        {fields.map((field, index) => (
          <Card key={index} className="p-4 bg-[#1a1f2c] border-gray-800 flex gap-4 items-center group">
            <div className="text-gray-600 cursor-grab">
              <GripVertical className="w-4 h-4" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1">
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase">Etiqueta (Visible)</label>
                <Input 
                  value={field.label} 
                  onChange={e => updateField(index, { label: e.target.value })}
                  className="bg-[#0f1219] border-gray-800"
                  placeholder="Ej: Nombre del Cliente"
                />
              </div>
              
              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase">ID Técnico (BD)</label>
                <Input 
                  value={field.name} 
                  onChange={e => updateField(index, { name: e.target.value })}
                  className="bg-[#0f1219] border-gray-800 font-mono text-xs"
                  placeholder="ej: nombre_cliente"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-gray-500 uppercase">Tipo de Dato</label>
                <select 
                  value={field.field_type}
                  onChange={e => updateField(index, { field_type: e.target.value as FieldType })}
                  className="w-full h-10 px-3 rounded-md bg-[#0f1219] border border-gray-800 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="text">Texto Corto</option>
                  <option value="textarea">Texto Largo</option>
                  <option value="number">Número</option>
                  <option value="date">Fecha</option>
                  <option value="boolean">Booleano (Si/No)</option>
                  <option value="select">Selección (Lista)</option>
                </select>
              </div>
            </div>

            <Button 
              onClick={() => removeField(index)} 
              variant="ghost" 
              size="icon" 
              className="text-gray-500 hover:text-red-500"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </Card>
        ))}
      </div>

      {fields.length > 0 && (
        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving} className="gap-2 bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4" /> {isSaving ? 'Guardando...' : 'Guardar Estructura'}
          </Button>
        </div>
      )}
    </div>
  );
};
