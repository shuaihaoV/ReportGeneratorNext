'use client';

import { useState, useEffect } from 'react';
import { Store, load } from '@tauri-apps/plugin-store';
import { toast } from 'sonner';
import { config } from '@/lib/config';

// 设置数据类型
interface SettingsData {
  hazardLevels: string[];
  hazardTypes: string[];
  industries: string[];
  unitTypes: string[];
}

// 默认设置数据
const defaultSettings: SettingsData = {
  hazardTypes: config.hazardTypes,
  industries: config.industries,
  unitTypes: config.unitTypes,
  hazardLevels: config.hazardLevels
};

export function useSettings() {
  const [settings, setSettings] = useState<SettingsData>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);

  // 初始化存储
  useEffect(() => {
    initStore();
  }, []);

  const initStore = async () => {
    try {
      const storeInstance = await load('config.json', { autoSave: true });
      setStore(storeInstance);
      await loadSettings(storeInstance);
    } catch (error) {
      console.error('Failed to initialize settings store:', error);
      toast.error('初始化设置失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async (storeInstance: Store) => {
    try {
      const storedSettings = await storeInstance.get('settings');
      if (storedSettings && typeof storedSettings === 'object') {
        setSettings(storedSettings as SettingsData);
      } else {
        console.log('没有存储的设置，使用默认设置并保存');
        await storeInstance.set('settings', defaultSettings);
        await storeInstance.save();
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      toast.error('加载设置失败');
    }
  };

  const updateSettings = async (newSettings: Partial<SettingsData>) => {
    if (!store) {
      console.error('Store not initialized');
      toast.error('数据存储未初始化');
      return false;
    }

    try {
      const updatedSettings = { ...settings, ...newSettings };
      await store.set('settings', updatedSettings);
      await store.save();
      setSettings(updatedSettings);
      console.log('Settings updated successfully:', updatedSettings);
      return true;
    } catch (error) {
      console.error('Failed to update settings:', error);
      toast.error('更新设置失败');
      return false;
    }
  };

  const addHazardType = async (hazardType: string) => {
    const trimmedType = hazardType.trim();
    if (!trimmedType) {
      toast.error('隐患类型不能为空');
      return false;
    }
    
    if (settings.hazardTypes.includes(trimmedType)) {
      toast.error('隐患类型已存在');
      return false;
    }

    const success = await updateSettings({
      hazardTypes: [...settings.hazardTypes, trimmedType]
    });
    
    if (success) {
      toast.success('隐患类型添加成功');
    }
    return success;
  };

  const removeHazardType = async (hazardType: string) => {
    const success = await updateSettings({
      hazardTypes: settings.hazardTypes.filter(type => type !== hazardType)
    });
    
    if (success) {
      toast.success('隐患类型删除成功');
    }
    return success;
  };

  const addIndustry = async (industry: string) => {
    const trimmedIndustry = industry.trim();
    if (!trimmedIndustry) {
      toast.error('行业类型不能为空');
      return false;
    }
    
    if (settings.industries.includes(trimmedIndustry)) {
      toast.error('行业类型已存在');
      return false;
    }

    const success = await updateSettings({
      industries: [...settings.industries, trimmedIndustry]
    });
    
    if (success) {
      toast.success('行业类型添加成功');
    }
    return success;
  };

  const removeIndustry = async (industry: string) => {
    const success = await updateSettings({
      industries: settings.industries.filter(ind => ind !== industry)
    });
    
    if (success) {
      toast.success('行业类型删除成功');
    }
    return success;
  };

  const addUnitType = async (unitType: string) => {
    const trimmedUnitType = unitType.trim();
    if (!trimmedUnitType) {
      toast.error('单位类型不能为空');
      return false;
    }
    
    if (settings.unitTypes.includes(trimmedUnitType)) {
      toast.error('单位类型已存在');
      return false;
    }

    const success = await updateSettings({
      unitTypes: [...settings.unitTypes, trimmedUnitType]
    });
    
    if (success) {
      toast.success('单位类型添加成功');
    }
    return success;
  };

  const removeUnitType = async (unitType: string) => {
    const success = await updateSettings({
      unitTypes: settings.unitTypes.filter(type => type !== unitType)
    });
    
    if (success) {
      toast.success('单位类型删除成功');
    }
    return success;
  };

  const resetToDefaults = async () => {
    const success = await updateSettings(defaultSettings);
    if (success) {
      toast.success('设置已重置为默认值');
    }
    return success;
  };

  return {
    settings,
    isLoading,
    updateSettings,
    addHazardType,
    removeHazardType,
    addIndustry,
    removeIndustry,
    addUnitType,
    removeUnitType,
    resetToDefaults
  };
} 