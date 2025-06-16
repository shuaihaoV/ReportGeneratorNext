'use client';

import { useState } from 'react';
import { Plus, Trash2, Folder, Download, Settings, Database, Edit2, Check, X, FileCog } from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useReport } from '@/contexts/ReportContext';
import { useNavigation } from '@/contexts/NavigationContext';

export function AppSidebar() {
  const { viewMode, currentView, navigateToProject, navigateToAppSettings, navigateToConfigManagement, navigateToVulnDB } = useNavigation();
  const { 
    projects, 
    setCurrentProject, 
    createProject, 
    deleteProject,
    renameProject,
    loadDemoData 
  } = useReport();
  
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newProjectName.trim()) {
      await createProject(newProjectName.trim());
      setNewProjectName('');
      setShowCreateForm(false);
    }
  };

  const handleStartEdit = (projectName: string) => {
    setEditingProject(projectName);
    setEditingName(projectName);
  };

  const handleSaveEdit = async () => {
    if (editingProject && editingName.trim() && editingName.trim() !== editingProject) {
      const success = await renameProject(editingProject, editingName.trim());
      if (success) {
        // 如果重命名的是当前查看的项目，更新导航状态
        if (viewMode === 'project' && currentView === editingProject) {
          navigateToProject(editingName.trim());
        }
        setEditingProject(null);
        setEditingName('');
      }
    } else {
      setEditingProject(null);
      setEditingName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingProject(null);
    setEditingName('');
  };

  return (
    <Sidebar data-tauri-drag-region>
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-0 mt-4" data-tauri-drag-region>
        <h2 className="text-lg font-semibold select-none" data-tauri-drag-region>风险隐患报告生成</h2>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowCreateForm(true)}
            className="h-8 w-8"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </SidebarHeader>
      
      <SidebarContent className="pt-0">
        <SidebarGroup>
          <SidebarGroupLabel className='select-none'>项目列表</SidebarGroupLabel>
          <SidebarGroupContent>
            {showCreateForm && (
              <form onSubmit={handleCreateProject} className="p-2 space-y-2">
                <Input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder="新项目名称..."
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button type="submit" size="sm" className="flex-1">
                    创建
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCreateForm(false)}
                  >
                    取消
                  </Button>
                </div>
              </form>
            )}
            
            <SidebarMenu>
              {projects.map((project) => (
                <SidebarMenuItem key={project.projectName}>
                  {editingProject === project.projectName ? (
                    // 编辑模式
                    <div className="flex items-center w-full p-2 space-x-2">
                      <Folder className="h-4 w-4 text-muted-foreground" />
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveEdit();
                          } else if (e.key === 'Escape') {
                            handleCancelEdit();
                          }
                        }}
                        className="flex-1 h-8"
                        autoFocus
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveEdit}
                        className="h-6 w-6"
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEdit}
                        className="h-6 w-6"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    // 使用右键菜单的普通显示模式
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <SidebarMenuButton
                          onClick={() => {
                            setCurrentProject(project);
                            navigateToProject(project.projectName);
                          }}
                          isActive={viewMode === 'project' && currentView === project.projectName}
                          className="w-full"
                        >
                          <Folder className="h-4 w-4" />
                          <span className="truncate">{project.projectName}</span>
                          <span className="ml-auto text-xs text-muted-foreground select-none">
                            {project.reportList.length}
                          </span>
                        </SidebarMenuButton>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem onClick={() => handleStartEdit(project.projectName)}>
                          <Edit2 className="h-4 w-4 mr-2" />
                          重命名项目
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => deleteProject(project.projectName)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          删除项目
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        
        <SidebarGroup>
          <SidebarGroupLabel className='select-none'>系统管理</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={navigateToAppSettings} 
                  isActive={viewMode === 'app-settings'}
                  className="w-full"
                >
                  <Settings className="h-4 w-4" />
                  <span className='select-none'>应用设置</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={navigateToConfigManagement} 
                  isActive={viewMode === 'config-management'}
                  className="w-full"
                >
                  <FileCog className="h-4 w-4" />
                  <span className='select-none'>配置管理</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={navigateToVulnDB} 
                  isActive={viewMode === 'vuln-db'}
                  className="w-full"
                >
                  <Database className="h-4 w-4" />
                  <span className='select-none'>漏洞数据库</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      {projects.length===0 && <SidebarFooter className="p-4">
        <Button 
          onClick={loadDemoData}
          variant="outline" 
          className="w-full"
        >
          <Download className="h-4 w-4 mr-2" />
          加载演示数据
        </Button>
      </SidebarFooter>}
      
    </Sidebar>
  );
} 