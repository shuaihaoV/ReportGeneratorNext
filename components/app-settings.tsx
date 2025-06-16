'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { 
  Database, 
  RefreshCw, 
  Monitor,
  HardDrive
} from 'lucide-react';
import { useReport } from '@/contexts/ReportContext';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { useSettings } from '@/hooks/useSettings';
import { useVulnDB } from '@/hooks/useVulnDB';

export function AppSettings() {
  const { 
    projects,
  } = useReport();
  const { theme, setTheme } = useTheme();
  const settings = useSettings();
  const vulnDB = useVulnDB();
  const getTotalReports = () => {
    return projects.reduce((total, project) => total + project.reportList.length, 0);
  };

  const handleResetConfig = async () => {
    await settings.resetToDefaults();
    toast.success('配置已还原');
  };

  const handleResetVulnDB = async () => {
    await vulnDB.resetToDefaults();
    toast.success('漏洞数据库已还原');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6" data-tauri-drag-region>
        <SidebarTrigger />
        <h2 className="text-2xl font-bold select-none" data-tauri-drag-region>应用设置</h2>
      </div>

      {/* 主题设置 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            外观设置
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium">主题模式</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <Button
                  variant={theme === 'light' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('light')}
                >
                  浅色
                </Button>
                <Button
                  variant={theme === 'dark' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('dark')}
                >
                  深色
                </Button>
                <Button
                  variant={theme === 'system' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTheme('system')}
                >
                  跟随系统
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据统计 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            数据统计
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{projects.length}</div>
              <div className="text-sm text-muted-foreground">项目总数</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">{getTotalReports()}</div>
              <div className="text-sm text-muted-foreground">报告总数</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-primary">
                {projects.length > 0 ? Math.round(getTotalReports() / projects.length) : 0}
              </div>
              <div className="text-sm text-muted-foreground">平均报告数/项目</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HardDrive className="h-5 w-5" />
            数据管理
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
              还原配置
              </Label>
              <p className="text-sm text-muted-foreground">
                还原默认配置到初始数据，包含隐患类型、所属行业、单位类型
              </p>
            </div>
            <Button onClick={handleResetConfig} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              还原配置
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Label className="text-sm font-medium">
                还原漏洞数据库
              </Label>
              <p className="text-sm text-muted-foreground">
                还原默认漏洞数据库到初始数据
              </p>
            </div>
            <Button onClick={handleResetVulnDB} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              还原漏洞
            </Button>
          </div>
          <Separator />
        </CardContent>
      </Card>

      {/* 版本信息 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            版本信息
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">应用版本:</span>
              <span className="ml-2 text-muted-foreground">v0.2.0</span>
            </div>
            <div>
              <span className="font-medium">构建日期:</span>
              <span className="ml-2 text-muted-foreground">{new Date().toLocaleDateString('zh-CN')}</span>
            </div>
            <div>
              <span className="font-medium">前端框架:</span>
              <span className="ml-2 text-muted-foreground">Next.js 15.3.3</span>
            </div>
            <div>
              <span className="font-medium">后端框架:</span>
              <span className="ml-2 text-muted-foreground">Tauri 2.5.1</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 