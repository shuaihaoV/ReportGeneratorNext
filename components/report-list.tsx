'use client';

import { FileText, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useReport } from '@/contexts/ReportContext';
import { RiskReportData } from '@/lib/types';

interface ReportListProps {
  onEditReport: (report: RiskReportData) => void;
}

export function ReportList({ onEditReport }: ReportListProps) {
  const { currentProject, deleteReport } = useReport();

  if (!currentProject) return null;

  if (currentProject.reportList.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />   
        <h3 className="text-lg font-medium select-none">暂无报告</h3>
        <p className="text-muted-foreground select-none">
          点击 新建报告 来开始创建你的第一份报告
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {currentProject.reportList.map((report) => (
        <div
          key={report.id}
          className="border rounded-lg p-6 bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <h4 className="text-lg font-medium truncate mb-2">
                {report.report_name} 
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground">
                <div>
                  <span className="font-medium">隐患级别: </span>
                  <span 
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      report.hazard_level === '严重' 
                        ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                        : report.hazard_level === '高危'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                        : report.hazard_level === '中危'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    }`}
                  >
                    {report.hazard_level}
                  </span>
                </div>
                <div>
                  <span className="font-medium">隐患类型: </span>
                  <span>{report.hazard_type}</span>
                </div>
                <div>
                  <span className="font-medium">单位名称: </span>
                  <span>{report.customer_company_name}</span>
                </div>
                <div>
                  <span className="font-medium">隐患编号: </span>
                  <span>{report.report_id}</span>
                </div>
                <div>
                  <span className="font-medium">网站域名: </span>
                  <span>{report.domain}</span>
                </div>
                <div>
                  <span className="font-medium">发现时间: </span>
                  <span>{report.report_time}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2 ml-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEditReport(report)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => deleteReport(report.id)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
} 