'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useSettings } from '@/hooks/useSettings';

export function ConfigManagement() {
  const { 
    settings, 
    addHazardType, 
    removeHazardType, 
    addIndustry, 
    removeIndustry, 
    addUnitType, 
    removeUnitType 
  } = useSettings();

  const [newItems, setNewItems] = useState({
    hazardType: '',
    industry: '',
    unitType: ''
  });

  // 添加新项目
  const handleAddItem = async (category: 'hazardTypes' | 'industries' | 'unitTypes', value: string) => {
    if (!value.trim()) return;
    
    let success = false;
    
    if (category === 'hazardTypes') {
      success = await addHazardType(value);
      if (success) setNewItems(prev => ({ ...prev, hazardType: '' }));
    } else if (category === 'industries') {
      success = await addIndustry(value);
      if (success) setNewItems(prev => ({ ...prev, industry: '' }));
    } else if (category === 'unitTypes') {
      success = await addUnitType(value);
      if (success) setNewItems(prev => ({ ...prev, unitType: '' }));
    }
  };

  // 删除项目
  const handleRemoveItem = async (category: 'hazardTypes' | 'industries' | 'unitTypes', item: string) => {
    if (category === 'hazardTypes') {
      await removeHazardType(item);
    } else if (category === 'industries') {
      await removeIndustry(item);
    } else if (category === 'unitTypes') {
      await removeUnitType(item);
    }
  };

  const renderItemList = (
    title: string,
    items: string[],
    category: 'hazardTypes' | 'industries' | 'unitTypes',
    newItemValue: string,
    setNewItemValue: (value: string) => void
  ) => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">{title}</Label>
        <span className="text-sm text-muted-foreground">共 {items.length} 项</span>
      </div>
      
      {/* 添加新项目 */}
      <div className="flex gap-2">
        <Input
          placeholder={`添加新的${title}...`}
          value={newItemValue}
          onChange={(e) => setNewItemValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleAddItem(category, newItemValue);
            }
          }}
        />
        <Button
          size="sm"
          onClick={() => handleAddItem(category, newItemValue)}
          disabled={!newItemValue.trim()}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* 项目列表 */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {items.map((item, index) => (
          <ItemRow
            key={`${category}-${index}`}
            item={item}
            onDelete={() => handleRemoveItem(category, item)}
          />
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6" data-tauri-drag-region>
        <SidebarTrigger />
        <h2 className="text-2xl font-bold select-none" data-tauri-drag-region>
          配置管理
        </h2>
      </div>

      <p className="text-muted-foreground select-none">
        管理隐患类型、所属行业、单位类型等选项。这些设置将在创建报告时作为可选项出现。
      </p>

      {renderItemList(
        '隐患类型',
        settings.hazardTypes,
        'hazardTypes',
        newItems.hazardType,
        (value) => setNewItems(prev => ({ ...prev, hazardType: value }))
      )}
      
      <Separator />
      
      {renderItemList(
        '所属行业',
        settings.industries,
        'industries',
        newItems.industry,
        (value) => setNewItems(prev => ({ ...prev, industry: value }))
      )}
      
      <Separator />
      
      {renderItemList(
        '单位类型',
        settings.unitTypes,
        'unitTypes',
        newItems.unitType,
        (value) => setNewItems(prev => ({ ...prev, unitType: value }))
      )}
    </div>
  );
}

// 可编辑的项目行组件
interface ItemRowProps {
  item: string;
  onDelete: () => void;
}

function ItemRow({ item, onDelete }: ItemRowProps) {
  return (
    <div className="flex items-center gap-2 p-3 rounded-md border bg-muted/30">
      <span className="flex-1 text-sm">{item}</span>
      <Button
        size="sm"
        variant="ghost"
        onClick={onDelete}
        className="text-destructive hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
} 