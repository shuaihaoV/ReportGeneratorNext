'use client';

import { useState, useEffect } from 'react';
import { Store, load } from '@tauri-apps/plugin-store';
import { toast } from 'sonner';
import { config } from '@/lib/config';

// 漏洞数据类型
export interface VulnData {
  vul_name: string;
  problem_description: string;
  vul_modify_repair: string;
}

const defaultVulnDB: VulnData[] = config.vuln_data;

export function useVulnDB() {
  const [vulnDB, setVulnDB] = useState<VulnData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [store, setStore] = useState<Store | null>(null);

  // 初始化存储
  useEffect(() => {
    initStore();
  }, []);

  const initStore = async () => {
    try {
      const storeInstance = await load('vuln.json', { autoSave: true });
      setStore(storeInstance);
      await loadVulnDB(storeInstance);
    } catch (error) {
      console.error('Failed to initialize vuln DB store:', error);
      toast.error('初始化漏洞数据库失败');
    } finally {
      setIsLoading(false);
    }
  };

  const loadVulnDB = async (storeInstance: Store) => {
    try {
      const storedVulnDB = await storeInstance.get('vulnDB');
      if (storedVulnDB && Array.isArray(storedVulnDB)) {
        setVulnDB(storedVulnDB as VulnData[]);
      } else {
        // 如果没有存储的漏洞数据，使用默认数据并保存
        await storeInstance.set('vulnDB', defaultVulnDB);
        await storeInstance.save();
        setVulnDB(defaultVulnDB);
      }
    } catch (error) {
      console.error('Failed to load vuln DB:', error);
      toast.error('加载漏洞数据库失败');
    }
  };

  const addVulnData = async (vulnData: VulnData) => {
    if (!store) return;

    try {
      // 检查是否已存在相同的漏洞名称
      const existingIndex = vulnDB.findIndex(item => item.vul_name === vulnData.vul_name);
      
      let updatedVulnDB: VulnData[];
      if (existingIndex !== -1) {
        // 如果已存在，更新数据
        updatedVulnDB = [...vulnDB];
        updatedVulnDB[existingIndex] = vulnData;
      } else {
        // 如果不存在，添加新数据
        updatedVulnDB = [...vulnDB, vulnData];
      }

      await store.set('vulnDB', updatedVulnDB);
      await store.save();
      setVulnDB(updatedVulnDB);
    } catch (error) {
      console.error('Failed to add vuln data:', error);
      toast.error('添加漏洞数据失败');
    }
  };

  const getVulnData = (vulnName: string): VulnData | undefined => {
    return vulnDB.find(item => item.vul_name === vulnName);
  };

  const removeVulnData = async (vulnName: string) => {
    if (!store) return false;

    try {
      const updatedVulnDB = vulnDB.filter(item => item.vul_name !== vulnName);
      await store.set('vulnDB', updatedVulnDB);
      await store.save();
      setVulnDB(updatedVulnDB);
      return true;
    } catch (error) {
      console.error('Failed to remove vuln data:', error);
      return false;
    }
  };

  const getVulnNames = (): string[] => {
    return vulnDB.map(item => item.vul_name);
  };

  const resetToDefaults = async () => {
    await store?.reset();
    await store?.save();
    if(store)
      await loadVulnDB(store);
      toast.success('漏洞数据库已重置为默认值');
  };

  return {
    vulnDB,
    isLoading,
    addVulnData,
    removeVulnData,
    getVulnData,
    getVulnNames,
    resetToDefaults
  };
} 