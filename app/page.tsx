'use client';

import { useState } from 'react';
import { Plus, FileText, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportList } from '@/components/report-list';
import { ReportForm } from '@/components/report-form';
import { AppSettings } from '@/components/app-settings';
import { ConfigManagement } from '@/components/config-management';
import { VulnDBForm } from '@/components/vuln-db-form';
import { useReport } from '@/contexts/ReportContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { RiskReportData } from '@/lib/types';
import { SidebarTrigger } from '@/components/ui/sidebar';

export default function HomePage() {
  const { 
    currentProject, 
    isLoading, 
    generateReport,
    addReport,
    updateReport 
  } = useReport();
  
  const { viewMode, navigateToReportForm, navigateToProject } = useNavigation();
  const [editingReport, setEditingReport] = useState<RiskReportData | undefined>();

  const handleSaveReport = async (report: RiskReportData) => {
    let success = false;
    
    if (editingReport) {
      success = await updateReport(editingReport.id, report);
    } else {
      success = await addReport(report);
    }
    
    // 操作成功后回到项目视图
    if (success) {
      if (currentProject) {
        navigateToProject(currentProject.projectName);
      }
      setEditingReport(undefined);
    }
  };

  const handleEditReport = (report: RiskReportData) => {
    setEditingReport(report);
    navigateToReportForm();
  };

  const handleNewReport = () => {
    setEditingReport(undefined);
    navigateToReportForm();
  };

  const handleCancelReportForm = () => {
    setEditingReport(undefined);
    if (currentProject) {
      navigateToProject(currentProject.projectName);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">正在加载项目数据...</p>
        </div>
      </div>
    );
  }

  // 根据当前的视图模式显示不同的内容
  switch (viewMode) {
    case 'report-form':
      return (
        <ReportForm
          report={editingReport}
          onSave={handleSaveReport}
          onCancel={handleCancelReportForm}
        />
      );
    
    case 'app-settings':
      return <AppSettings />;
    
    case 'config-management':
      return <ConfigManagement />;
    
    case 'vuln-db':
      return <VulnDBForm />;
    
    case 'project':
    default:
      // 显示项目内容或欢迎页面
      if (!currentProject) {
        return (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <FileText className="h-16 w-16 text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">欢迎使用风险隐患报告生成器</h2>
            <p className="text-muted-foreground mb-6 max-w-md">
              请从左侧选择一个项目，或创建一个新项目来开始管理你的风险隐患报告
            </p>
          </div>
        );
      }

      return (
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6" data-tauri-drag-region>
            <h1 className="text-2xl font-bold select-none" data-tauri-drag-region>
              <SidebarTrigger />{currentProject.projectName}
            </h1>
            <div className="flex gap-2">
              <Button onClick={handleNewReport}>
                <Plus className="h-4 w-4 mr-2" />
                新增报告
              </Button>
              <Button 
                onClick={generateReport}
                variant="outline"
                disabled={!currentProject.reportList.length}
              >
                <Download className="h-4 w-4 mr-2" />
                生成报告
              </Button>
            </div>
          </div>
          <ReportList 
            onEditReport={handleEditReport}
          />
        </div>
      );
  }
}
