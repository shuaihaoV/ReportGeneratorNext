'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

export type ViewMode = 'project' | 'app-settings' | 'config-management' | 'vuln-db' | 'report-form';

interface NavigationContextType {
  viewMode: ViewMode;
  currentView: string; // 项目名称或管理页面标识
  setViewMode: (mode: ViewMode, view?: string) => void;
  navigateToProject: (projectName: string) => void;
  navigateToAppSettings: () => void;
  navigateToConfigManagement: () => void;
  navigateToVulnDB: () => void;
  navigateToReportForm: () => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [viewMode, setViewModeState] = useState<ViewMode>('project');
  const [currentView, setCurrentView] = useState<string>('');

  const setViewMode = (mode: ViewMode, view?: string) => {
    setViewModeState(mode);
    if (view !== undefined) {
      setCurrentView(view);
    }
  };

  const navigateToProject = (projectName: string) => {
    setViewModeState('project');
    setCurrentView(projectName);
  };

  const navigateToAppSettings = () => {
    setViewModeState('app-settings');
    setCurrentView('app-settings');
  };

  const navigateToConfigManagement = () => {
    setViewModeState('config-management');
    setCurrentView('config-management');
  };

  const navigateToVulnDB = () => {
    setViewModeState('vuln-db');
    setCurrentView('vuln-db');
  };

  const navigateToReportForm = () => {
    setViewModeState('report-form');
    setCurrentView('report-form');
  };

  return (
    <NavigationContext.Provider value={{
      viewMode,
      currentView,
      setViewMode,
      navigateToProject,
      navigateToAppSettings,
      navigateToConfigManagement,
      navigateToVulnDB,
      navigateToReportForm
    }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
} 