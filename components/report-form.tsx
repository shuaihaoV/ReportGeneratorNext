'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { open as openFileDialog } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { X, Image as ImageIcon, Type, Eye, Clipboard, PictureInPicture2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { invoke } from '@tauri-apps/api/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { CreatableCombobox } from '@/components/ui/creatable-combobox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { RiskReportData, ScreenshotContent } from '@/lib/types';
import { hazardLevels } from '@/lib/config';
import { useSettings } from '@/hooks/useSettings';
import { useVulnDB } from '@/hooks/useVulnDB';
import { useReport } from '@/contexts/ReportContext';
import clipboard from "tauri-plugin-clipboard-api";

interface ReportFormProps {
  report?: RiskReportData;
  onSave: (report: RiskReportData) => void;
  onCancel: () => void;
}

// 文件大小限制 (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// 支持的图片格式
const SUPPORTED_IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'];

// 生成隐患编号的函数 - 使用useCallback优化
const generateReportId = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  // 生成6位随机数字
  const randomNum = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');

  return `HN-${year}-${month}-${day}-${randomNum}`;
};

export function ReportForm({ report, onSave, onCancel }: ReportFormProps) {
  const { settings, addHazardType, addIndustry, addUnitType } = useSettings();
  const { addVulnData, getVulnData, getVulnNames } = useVulnDB();
  const { isLoading: isReportLoading } = useReport();

  // 使用useMemo优化默认数据
  const defaultData = useMemo(() => ({
    id: '', // 新建时为空，由Context生成
    report_id: generateReportId(), // 自动生成隐患编号
    hazard_type: '', // 初始为空，等待settings加载
    report_name: '',
    hazard_level: hazardLevels[0], // 使用配置文件中的第一个选项
    target: '',
    vul_name: '',
    warning_level: '中',
    city: '',
    unit_type: '', // 初始为空，等待settings加载
    industry: '', // 初始为空，等待settings加载  
    customer_company_name: '',
    website_name: '',
    domain: '',
    ip_address: '',
    case_number: '',
    report_time: new Date().toISOString().split('T')[0],
    problem_description: '',
    vul_modify_repair: '',
    evidence_screenshots: [],
    filing_screenshots: [],
    remark: ''
  }), []);

  const [formData, setFormData] = useState<RiskReportData>(() => report || defaultData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<{ open: boolean; src: string; title: string }>({
    open: false,
    src: '',
    title: ''
  });

  // 当settings加载完成后，如果是新建报告且相关字段为空，则设置默认值
  useEffect(() => {
    if (!report && settings.hazardTypes.length > 0) {
      setFormData(prev => ({
        ...prev,
        hazard_type: prev.hazard_type || settings.hazardTypes[0],
        unit_type: prev.unit_type || settings.unitTypes[0],
        industry: prev.industry || settings.industries[0]
      }));
    }
  }, [settings, report]);

  // 文本输入对话框状态
  const [textDialog, setTextDialog] = useState({
    open: false,
    type: 'evidence_screenshots' as 'evidence_screenshots' | 'filing_screenshots',
    value: ''
  });

  // 使用useCallback优化事件处理函数
  const handleInputChange = useCallback((field: keyof RiskReportData, value: string) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };

      // 当修改漏洞名称时，自动更新隐患名称
      if (field === 'vul_name' && value.trim()) {
        newData.report_name = `存在${value.trim()}漏洞隐患`;

        // 如果选择的是预定义的漏洞类型，自动填充问题描述和修复建议
        const vulnInfo = getVulnData(value.trim());
        if (vulnInfo) {
          newData.problem_description = vulnInfo.problem_description;
          newData.vul_modify_repair = vulnInfo.vul_modify_repair;
        }
      }

      return newData;
    });
  }, [getVulnData]);

  // 文件验证函数
  const validateFile = useCallback((filePath: string, fileSize?: number): boolean => {
    const extension = filePath.split('.').pop()?.toLowerCase();

    if (!extension || !SUPPORTED_IMAGE_TYPES.includes(extension)) {
      toast.error(`不支持的文件格式。支持的格式：${SUPPORTED_IMAGE_TYPES.join(', ')}`);
      return false;
    }

    if (fileSize && fileSize > MAX_FILE_SIZE) {
      toast.error(`文件大小超过限制。最大允许大小：${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`);
      return false;
    }

    return true;
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting || isReportLoading) return;

    // 只验证隐患编号为必填项
    if (!formData.report_id.trim()) {
      toast.error('请填写隐患编号');
      return;
    }

    setIsSubmitting(true);

    try {
      // 如果有新的设置项，保存到store中
      const promises = [];

      if (formData.hazard_type && !settings.hazardTypes.includes(formData.hazard_type)) {
        promises.push(addHazardType(formData.hazard_type));
      }

      if (formData.industry && !settings.industries.includes(formData.industry)) {
        promises.push(addIndustry(formData.industry));
      }

      if (formData.unit_type && !settings.unitTypes.includes(formData.unit_type)) {
        promises.push(addUnitType(formData.unit_type));
      }

      // 如果有新的漏洞信息，保存到漏洞数据库中
      if (formData.vul_name && formData.problem_description && formData.vul_modify_repair) {
        const existingVuln = getVulnData(formData.vul_name);
        if (!existingVuln ||
          existingVuln.problem_description !== formData.problem_description ||
          existingVuln.vul_modify_repair !== formData.vul_modify_repair) {
          promises.push(addVulnData({
            vul_name: formData.vul_name,
            problem_description: formData.problem_description,
            vul_modify_repair: formData.vul_modify_repair
          }));
        }
      }

      await Promise.all(promises);
      onSave(formData);
    } catch (error) {
      console.error('Failed to save report:', error);
      toast.error('保存报告失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, isSubmitting, isReportLoading, settings, addHazardType, addIndustry, addUnitType, getVulnData, addVulnData, onSave]);

  const handleAddImage = useCallback(async (type: 'evidence_screenshots' | 'filing_screenshots') => {
    try {
      const file = await openFileDialog({
        multiple: false,
        directory: false,
        filters: [
          {
            name: '图片文件',
            extensions: SUPPORTED_IMAGE_TYPES
          }
        ]
      });

      if (file) {
        // 验证文件
        if (!validateFile(file as string)) {
          return;
        }

        const fileData = await readFile(file as string);

        // 验证文件大小
        if (fileData.length > MAX_FILE_SIZE) {
          toast.error(`文件大小超过限制。最大允许大小：${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`);
          return;
        }

        const newScreenshot: ScreenshotContent = {
          type: 'image',
          content: fileData
        };

        setFormData(prev => ({
          ...prev,
          [type]: [...prev[type], newScreenshot]
        }));

        toast.success('图片添加成功');
      }
    } catch (error) {
      console.error('Failed to add image:', error);
      toast.error('添加图片失败，请重试');
    }
  }, [validateFile]);

  const handlePasteImage = useCallback(async (type: 'evidence_screenshots' | 'filing_screenshots') => {
    try {
      const fileData = await clipboard.readImageBinary("Uint8Array") as Uint8Array;

      if (fileData && fileData.length > 0) {
        // 验证文件大小
        if (fileData.length > MAX_FILE_SIZE) {
          toast.error(`文件大小超过限制。最大允许大小：${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`);
          return;
        }

        const newScreenshot: ScreenshotContent = {
          type: 'image',
          content: fileData
        };

        setFormData(prev => ({
          ...prev,
          [type]: [...prev[type], newScreenshot]
        }));

        toast.success('图片粘贴成功');
      } else {
        toast.error('剪贴板中没有图片数据');
      }
    } catch (error) {
      console.error('Failed to paste image:', error);
      toast.error('粘贴图片失败，请确保剪贴板中有图片');
    }
  }, []);

  const handleAddText = useCallback((type: 'evidence_screenshots' | 'filing_screenshots') => {
    setTextDialog({
      open: true,
      type,
      value: ''
    });
  }, []);

  const handleConfirmText = useCallback(() => {
    if (textDialog.value.trim()) {
      const newScreenshot: ScreenshotContent = {
        type: 'text',
        content: textDialog.value.trim()
      };

      setFormData(prev => ({
        ...prev,
        [textDialog.type]: [...prev[textDialog.type], newScreenshot]
      }));

      toast.success('文本添加成功');
    }

    setTextDialog({
      open: false,
      type: 'evidence_screenshots',
      value: ''
    });
  }, [textDialog]);

  const handleCancelText = useCallback(() => {
    setTextDialog({
      open: false,
      type: 'evidence_screenshots',
      value: ''
    });
  }, []);

  const removeScreenshot = useCallback((type: 'evidence_screenshots' | 'filing_screenshots', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  }, []);

  // 图片预览功能
  const handlePreviewImage = useCallback((content: Uint8Array, title: string) => {
    try {
      // 检测图片格式
      let mimeType = 'image/png'; // 默认
      if (content.length > 8) {
        // PNG: 89 50 4E 47
        if (content[0] === 0x89 && content[1] === 0x50 && content[2] === 0x4E && content[3] === 0x47) {
          mimeType = 'image/png';
        }
        // JPEG: FF D8 FF
        else if (content[0] === 0xFF && content[1] === 0xD8 && content[2] === 0xFF) {
          mimeType = 'image/jpeg';
        }
        // GIF: 47 49 46 38
        else if (content[0] === 0x47 && content[1] === 0x49 && content[2] === 0x46 && content[3] === 0x38) {
          mimeType = 'image/gif';
        }
        // WebP: 52 49 46 46
        else if (content[0] === 0x52 && content[1] === 0x49 && content[2] === 0x46 && content[3] === 0x46) {
          mimeType = 'image/webp';
        }
        // BMP: 42 4D
        else if (content[0] === 0x42 && content[1] === 0x4D) {
          mimeType = 'image/bmp';
        }
      }

      // 使用 Blob 和 FileReader 来生成 Data URL，避免 "Maximum call stack size exceeded" 错误
      const blob = new Blob([new Uint8Array(content)], { type: mimeType });
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setPreviewImage({ open: true, src: dataUrl, title });
        } else {
          toast.error('预览图片失败：无法读取图片数据');
        }
      };
      reader.onerror = (error) => {
        console.error('Failed to preview image with FileReader:', error);
        toast.error('预览图片失败');
      };
      reader.readAsDataURL(blob);

    } catch (error) {
      console.error('Failed to preview image:', error);
      toast.error('预览图片失败');
    }
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewImage({ open: false, src: '', title: '' });
  }, []);

  // 处理备案查询窗口
  const openICPWindow = useCallback(async () => {
    try {
      await invoke("open_icp_query_window");
      toast.success('备案查询窗口已打开');
    } catch (e) {
      console.error('Failed to open icp query window:', e);
      toast.error('打开备案查询窗口失败');
    }
  }, []);

  const renderScreenshots = useCallback((type: 'evidence_screenshots' | 'filing_screenshots', title: string) => {
    const screenshots = formData[type];

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-base font-medium">{title}</Label>
          <div className="flex gap-2">
            {type === "filing_screenshots" &&
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openICPWindow}
              >
                <PictureInPicture2 className="h-4 w-4 mr-1" />
                备案查询窗口
              </Button>}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddText(type)}
            >
              <Type className="h-4 w-4 mr-1" />
              添加文本
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleAddImage(type)}
            >
              <ImageIcon className="h-4 w-4 mr-1" />
              上传图片
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handlePasteImage(type)}
            >
              <Clipboard className="h-4 w-4 mr-1" />
              粘贴图片
            </Button>

          </div>
        </div>

        {screenshots.length > 0 && (
          <div className="space-y-2">
            {screenshots.map((screenshot, index) => (
              <div key={`${type}-${index}`} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-2">
                  {screenshot.type === 'image' ? (
                    <ImageIcon className="h-4 w-4 text-blue-500" />
                  ) : (
                    <Type className="h-4 w-4 text-green-500" />
                  )}
                  <span className="text-sm">
                    {screenshot.type === 'image'
                      ? `图片 ${index + 1} (${Math.round(screenshot.content.length / 1024)}KB)`
                      : screenshot.content.length > 50
                        ? `${screenshot.content.substring(0, 50)}...`
                        : screenshot.content
                    }
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {screenshot.type === 'image' && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePreviewImage(screenshot.content, `${title} ${index + 1}`)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeScreenshot(type, index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }, [formData, openICPWindow, handleAddText, handleAddImage, handlePasteImage, handlePreviewImage, removeScreenshot]);

  return (
    <>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6" data-tauri-drag-region>
          <h2 className="text-2xl font-bold select-none" data-tauri-drag-region>
            <SidebarTrigger />
            {report ? '编辑报告' : '新建报告'}
          </h2>
          <Button variant="ghost" onClick={onCancel} disabled={isSubmitting}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 基本信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">基本信息</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="report_id">隐患编号 <span className="text-red-500">*</span></Label>
                <Input
                  id="report_id"
                  value={formData.report_id}
                  onChange={(e) => handleInputChange('report_id', e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="hazard_type">隐患类型</Label>
                <CreatableCombobox
                  options={settings.hazardTypes}
                  value={formData.hazard_type}
                  onValueChange={(value) => handleInputChange('hazard_type', value)}
                  placeholder="选择或输入隐患类型..."
                  searchPlaceholder="搜索或输入新的隐患类型..."
                  emptyMessage="未找到匹配的隐患类型"
                  createMessage="创建新隐患类型"
                />
              </div>
              <div>
                <Label htmlFor="vul_name">漏洞名称</Label>
                <CreatableCombobox
                  options={getVulnNames()}
                  value={formData.vul_name}
                  onValueChange={(value) => handleInputChange('vul_name', value)}
                  placeholder="选择或输入漏洞名称..."
                  searchPlaceholder="搜索或输入新的漏洞名称..."
                  emptyMessage="未找到匹配的漏洞类型"
                  createMessage="创建新漏洞类型"
                />
              </div>
              <div>
                <Label htmlFor="report_name">隐患名称 - (自动生成)</Label>
                <Input
                  id="report_name"
                  placeholder='根据漏洞名称自动生成'
                  value={formData.report_name}
                  onChange={(e) => handleInputChange('report_name', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="target">隐患URL</Label>
                <Input
                  id="target"
                  value={formData.target}
                  onChange={(e) => handleInputChange('target', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="hazard_level">隐患级别</Label>
                <Select value={formData.hazard_level} onValueChange={(value) => handleInputChange('hazard_level', value)} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hazardLevels.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="report_time">发现时间</Label>
                <Input
                  id="report_time"
                  type="date"
                  value={formData.report_time}
                  onChange={(e) => handleInputChange('report_time', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="warning_level">预警级别</Label>
                <Select value={formData.warning_level} onValueChange={(value) => handleInputChange('warning_level', value)} disabled={isSubmitting}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="低">低</SelectItem>
                    <SelectItem value="中">中</SelectItem>
                    <SelectItem value="高">高</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <Separator />

          {/* 公司信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">公司信息</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="customer_company_name">单位名称</Label>
                <Input
                  id="customer_company_name"
                  value={formData.customer_company_name}
                  onChange={(e) => handleInputChange('customer_company_name', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="unit_type">单位类型</Label>
                <CreatableCombobox
                  options={settings.unitTypes}
                  value={formData.unit_type}
                  onValueChange={(value) => handleInputChange('unit_type', value)}
                  placeholder="选择或输入单位类型..."
                  searchPlaceholder="搜索或输入新的单位类型..."
                  emptyMessage="未找到匹配的单位类型"
                  createMessage="创建新单位类型"
                />
              </div>

              <div>
                <Label htmlFor="city">归属地市</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="industry">所属行业</Label>
                <CreatableCombobox
                  options={settings.industries}
                  value={formData.industry}
                  onValueChange={(value) => handleInputChange('industry', value)}
                  placeholder="选择或输入所属行业..."
                  searchPlaceholder="搜索或输入新的行业..."
                  emptyMessage="未找到匹配的行业"
                  createMessage="创建新行业"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 技术信息 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">技术信息</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="website_name">网站名称</Label>
                <Input
                  id="website_name"
                  value={formData.website_name}
                  onChange={(e) => handleInputChange('website_name', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="domain">网站域名</Label>
                <Input
                  id="domain"
                  value={formData.domain}
                  onChange={(e) => handleInputChange('domain', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="ip_address">网站IP</Label>
                <Input
                  id="ip_address"
                  value={formData.ip_address}
                  onChange={(e) => handleInputChange('ip_address', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Label htmlFor="case_number">工信备案号</Label>
                <Input
                  id="case_number"
                  value={formData.case_number}
                  onChange={(e) => handleInputChange('case_number', e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 详细描述 */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">详细描述</h3>

            <div>
              <Label htmlFor="problem_description">问题描述</Label>
              <textarea
                id="problem_description"
                value={formData.problem_description}
                onChange={(e) => handleInputChange('problem_description', e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-y"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="vul_modify_repair">整改建议</Label>
              <textarea
                id="vul_modify_repair"
                value={formData.vul_modify_repair}
                onChange={(e) => handleInputChange('vul_modify_repair', e.target.value)}
                className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-y"
                disabled={isSubmitting}
              />
            </div>

            <div>
              <Label htmlFor="remark">备注</Label>
              <textarea
                id="remark"
                value={formData.remark}
                onChange={(e) => handleInputChange('remark', e.target.value)}
                className="w-full min-h-[80px] px-3 py-2 border rounded-md resize-y"
                disabled={isSubmitting}
              />
            </div>
          </div>

          <Separator />

          {/* 截图部分 */}
          <div className="space-y-6">
            {renderScreenshots('evidence_screenshots', '证据截图')}
            {renderScreenshots('filing_screenshots', '域名备案截图')}
          </div>

          <Separator />

          {/* 提交按钮 */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || isReportLoading}>
              {(isSubmitting || isReportLoading) ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  {isReportLoading ? '初始化中...' : (report ? '更新中...' : '创建中...')}
                </>
              ) : (
                report ? '更新报告' : '创建报告'
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* 文本输入对话框 */}
      <Dialog open={textDialog.open} onOpenChange={(open: boolean) => !open && handleCancelText()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加文本说明</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="text-content">文本内容</Label>
              <textarea
                id="text-content"
                value={textDialog.value}
                onChange={(e) => setTextDialog(prev => ({ ...prev, value: e.target.value }))}
                className="w-full min-h-[100px] px-3 py-2 border rounded-md resize-y"
                placeholder="请输入文本说明..."
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelText}>
              取消
            </Button>
            <Button onClick={handleConfirmText} disabled={!textDialog.value.trim()}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 图片预览对话框 */}
      <Dialog open={previewImage.open} onOpenChange={handleClosePreview}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewImage.title}</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center">
            {previewImage.src && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-w-full max-h-[70vh] object-contain"
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleClosePreview}>
              关闭
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
} 