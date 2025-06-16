'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { load, Store } from '@tauri-apps/plugin-store';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { RiskReportData, ReportProject } from '@/lib/types';
import { demoProjects } from '@/lib/demo';

// 上下文类型定义
interface ReportContextType {
  projects: ReportProject[];
  currentProject: ReportProject | null;
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  setCurrentProject: (project: ReportProject) => void;
  createProject: (name: string) => Promise<void>;
  deleteProject: (projectName: string) => Promise<void>;
  renameProject: (oldName: string, newName: string) => Promise<boolean>;
  addReport: (report: RiskReportData) => Promise<boolean>;
  updateReport: (internalId: string, report: RiskReportData) => Promise<boolean>;
  deleteReport: (internalId: string) => Promise<void>;
  generateReport: () => Promise<void>;
  loadDemoData: () => Promise<void>;
  saveProject: (project: ReportProject) => Promise<boolean>;
}

// 错误类型定义
class ReportError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'ReportError';
  }
}

// 创建上下文
const ReportContext = createContext<ReportContextType | null>(null);

// Provider组件
export function ReportProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState<ReportProject[]>([]);
  const [currentProject, setCurrentProject] = useState<ReportProject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [docStore, setDocStore] = useState<Store | null>(null);
  
  // 初始化存储
  useEffect(() => {
    initDocStore();
  }, []);

  const initDocStore = async () => {
    try {
      setIsLoading(true);
      const docStoreInstance = await load('docStore.json', { autoSave: false });
      setDocStore(docStoreInstance);
      await loadProjects(docStoreInstance);
      console.log('Store initialized successfully');
    } catch (error) {
      console.error('Failed to initialize store:', error);
      toast.error('初始化存储失败，请检查应用权限');
      throw new ReportError('存储初始化失败', 'STORE_INIT_FAILED');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async (storeInstance: Store) => {
    try {
      const keys = await storeInstance.keys();
      const loadedProjects: ReportProject[] = [];
      
      // 并行加载所有项目
      const projectPromises = keys.map(async (key) => {
        try {
          const project = await storeInstance.get(key);
          if (project && typeof project === 'object' && 'projectName' in project) {
            return project as ReportProject;
          }
        } catch (error) {
          console.warn(`Failed to load project ${key}:`, error);
        }
        return null;
      });

      const projectResults = await Promise.all(projectPromises);
      projectResults.forEach(project => {
        if (project) {
          loadedProjects.push(project);
        }
      });
      
      setProjects(loadedProjects);
      if (loadedProjects.length > 0 && !currentProject) {
        setCurrentProject(loadedProjects[0]);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
      toast.error('加载项目失败');
      throw new ReportError('项目加载失败', 'PROJECTS_LOAD_FAILED');
    }
  };

  const saveProject = useCallback(async (project: ReportProject): Promise<boolean> => {
    if (!docStore) {
      console.error('Store not initialized');
      toast.error('数据存储未初始化，请稍后重试');
      return false;
    }

    setIsSaving(true);
    try {
      await docStore.set(project.projectName, project);
      await docStore.save();
      setLastSaved(new Date());
      return true;
    } catch (error) {
      console.error('Failed to save project:', error);
      toast.error('保存项目失败');
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [docStore]);

  const createProject = useCallback(async (name: string) => {
    if (!docStore) {
      throw new ReportError('存储未初始化', 'STORE_NOT_READY');
    }
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new ReportError('项目名称不能为空', 'EMPTY_PROJECT_NAME');
    }

    const existingProject = projects.find(p => p.projectName === trimmedName);
    if (existingProject) {
      throw new ReportError('项目名称已存在', 'PROJECT_EXISTS');
    }

    const newProject: ReportProject = {
      projectName: trimmedName,
      reportList: []
    };

    try {
      const success = await saveProject(newProject);
      if (success) {
        setProjects(prev => [...prev, newProject]);
        setCurrentProject(newProject);
        toast.success('项目创建成功');
      } else {
        throw new ReportError('保存项目失败', 'SAVE_FAILED');
      }
    } catch (error) {
      console.error('Failed to create project:', error);
      toast.error(error instanceof ReportError ? error.message : '创建项目失败');
      throw error;
    }
  }, [docStore, projects, saveProject]);

  const deleteProject = useCallback(async (projectName: string) => {
    if (!docStore) return;
    
    try {
      await docStore.delete(projectName);
      await docStore.save();
      
      setProjects(prev => prev.filter(p => p.projectName !== projectName));
      
      if (currentProject?.projectName === projectName) {
        const remainingProjects = projects.filter(p => p.projectName !== projectName);
        setCurrentProject(remainingProjects.length > 0 ? remainingProjects[0] : null);
      }
      
      toast.success('项目删除成功');
    } catch (error) {
      console.error('Failed to delete project:', error);
      toast.error('删除项目失败');
      throw new ReportError('删除项目失败', 'DELETE_FAILED');
    }
  }, [docStore, currentProject, projects]);

  const renameProject = useCallback(async (oldName: string, newName: string): Promise<boolean> => {
    if (!docStore) return false;
    
    const trimmedNewName = newName.trim();
    if (!trimmedNewName) {
      toast.error('项目名称不能为空');
      return false;
    }

    // 检查新名称是否已存在
    const existingProject = projects.find(p => p.projectName === trimmedNewName);
    if (existingProject) {
      toast.error('项目名称已存在');
      return false;
    }
    
    // 找到要重命名的项目
    const projectToRename = projects.find(p => p.projectName === oldName);
    if (!projectToRename) {
      toast.error('项目不存在');
      return false;
    }
    
    try {
      // 创建新的项目对象
      const renamedProject = {
        ...projectToRename,
        projectName: trimmedNewName
      };
      
      // 保存新项目并删除旧项目
      await docStore.set(trimmedNewName, renamedProject);
      await docStore.delete(oldName);
      await docStore.save();
      
      // 更新本地状态
      setProjects(prev => prev.map(p => 
        p.projectName === oldName ? renamedProject : p
      ));
      
      // 如果重命名的是当前项目，更新当前项目
      if (currentProject?.projectName === oldName) {
        setCurrentProject(renamedProject);
      }
      
      toast.success('项目重命名成功');
      return true;
    } catch (error) {
      console.error('Failed to rename project:', error);
      toast.error('重命名项目失败');
      return false;
    }
  }, [docStore, projects, currentProject]);

  const addReport = useCallback(async (report: RiskReportData): Promise<boolean> => {
    if (!currentProject) {
      toast.error('请先选择一个项目');
      return false;
    }
    
    if (!docStore) {
      toast.error('数据存储未初始化，请稍后重试');
      return false;
    }
    
    // 检查隐患编号是否已存在
    const existingReport = currentProject.reportList.find(r => r.report_id === report.report_id);
    if (existingReport) {
      toast.error('隐患编号已存在，请使用不同的编号');
      return false;
    }
    
    // 为新报告生成内部唯一ID
    const reportWithId = {
      ...report,
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    const updatedProject = {
      ...currentProject,
      reportList: [...currentProject.reportList, reportWithId]
    };
    
    try {
      const success = await saveProject(updatedProject);
      if (success) {
        setCurrentProject(updatedProject);
        setProjects(prev => prev.map(p => 
          p.projectName === currentProject.projectName ? updatedProject : p
        ));
        toast.success('报告添加成功');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to add report:', error);
      toast.error('添加报告失败');
      return false;
    }
  }, [currentProject, docStore, saveProject]);

  const updateReport = useCallback(async (internalId: string, updatedReport: RiskReportData): Promise<boolean> => {
    if (!currentProject) {
      toast.error('请先选择一个项目');
      return false;
    }
    
    if (!docStore) {
      toast.error('数据存储未初始化，请稍后重试');
      return false;
    }
    
    // 找到当前报告
    const currentReport = currentProject.reportList.find(r => r.id === internalId);
    if (!currentReport) {
      toast.error('报告不存在');
      return false;
    }
    
    // 如果隐患编号发生了变化，检查新编号是否已存在
    if (currentReport.report_id !== updatedReport.report_id) {
      const existingReport = currentProject.reportList.find(r => 
        r.report_id === updatedReport.report_id && r.id !== internalId
      );
      if (existingReport) {
        toast.error('隐患编号已存在，请使用不同的编号');
        return false;
      }
    }
    
    const updatedProject = {
      ...currentProject,
      reportList: currentProject.reportList.map(r => 
        r.id === internalId ? { ...updatedReport, id: internalId } : r
      )
    };
    
    try {
      const success = await saveProject(updatedProject);
      if (success) {
        setCurrentProject(updatedProject);
        setProjects(prev => prev.map(p => 
          p.projectName === currentProject.projectName ? updatedProject : p
        ));
        toast.success('报告更新成功');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to update report:', error);
      toast.error('更新报告失败');
      return false;
    }
  }, [currentProject, docStore, saveProject]);

  const deleteReport = useCallback(async (internalId: string) => {
    if (!currentProject) {
      toast.error('请先选择一个项目');
      return;
    }
    
    if (!docStore) {
      toast.error('数据存储未初始化，请稍后重试');
      return;
    }
    
    const updatedProject = {
      ...currentProject,
      reportList: currentProject.reportList.filter(r => r.id !== internalId)
    };
    
    try {
      const success = await saveProject(updatedProject);
      if (success) {
        setCurrentProject(updatedProject);
        setProjects(prev => prev.map(p => 
          p.projectName === currentProject.projectName ? updatedProject : p
        ));
        toast.success('报告删除成功');
      }
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('删除报告失败');
    }
  }, [currentProject, docStore, saveProject]);

  const generateReport = useCallback(async () => {
    if (!currentProject || currentProject.reportList.length === 0) {
      toast.error('请先添加报告！');
      return;
    }

    try {
      const result = await invoke('generate', {
        projectName: currentProject.projectName,
        reportList: currentProject.reportList
      });
      
      toast.success(result as string);
    } catch (error) {
      toast.error(`报告生成失败: ${error}`);
    }
  }, [currentProject]);

  const loadDemoData = useCallback(async () => {
    if (!docStore) return;
    
    try {
      // 批量保存所有演示项目
      const savePromises = demoProjects.map(project => saveProject(project));
      await Promise.all(savePromises);
      
      // 更新本地状态
      setProjects(prev => {
        const existingNames = prev.map(p => p.projectName);
        const newProjects = demoProjects.filter(p => !existingNames.includes(p.projectName));
        return [...prev, ...newProjects];
      });
      
      // 设置第一个演示项目为当前项目
      if (demoProjects.length > 0 && !currentProject) {
        setCurrentProject(demoProjects[0]);
      }
      
      toast.success('演示数据加载成功！');
    } catch (error) {
      console.error('Failed to load demo data:', error);
      toast.error('加载演示数据失败，请重试');
    }
  }, [docStore, currentProject, saveProject]);

  const contextValue: ReportContextType = {
    projects,
    currentProject,
    isLoading,
    isSaving,
    lastSaved,
    setCurrentProject,
    createProject,
    deleteProject,
    renameProject,
    addReport,
    updateReport,
    deleteReport,
    generateReport,
    loadDemoData,
    saveProject
  };

  return (
    <ReportContext.Provider value={contextValue}>
      {children}
    </ReportContext.Provider>
  );
}

// Hook for using the context
export function useReport() {
  const context = useContext(ReportContext);
  if (!context) {
    throw new Error('useReport must be used within a ReportProvider');
  }
  return context;
} 