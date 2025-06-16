'use client';

import { useState, useMemo } from 'react';
import { Plus, Search, Edit2, Trash2, Save, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useVulnDB, VulnData } from '@/hooks/useVulnDB';

export function VulnDBForm() {
  const { vulnDB, addVulnData, removeVulnData } = useVulnDB();
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVuln, setEditingVuln] = useState<string | null>(null);

  // 新建漏洞表单数据
  const [newVuln, setNewVuln] = useState<VulnData>({
    vul_name: '',
    problem_description: '',
    vul_modify_repair: ''
  });

  // 编辑漏洞表单数据
  const [editingData, setEditingData] = useState<VulnData>({
    vul_name: '',
    problem_description: '',
    vul_modify_repair: ''
  });

  // 过滤漏洞数据
  const filteredVulns = useMemo(() => {
    if (!searchTerm) return vulnDB;
    
    return vulnDB.filter(vuln => 
      vuln.vul_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vuln.problem_description.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [vulnDB, searchTerm]);

  // 创建新漏洞
  const handleCreate = async () => {
    if (!newVuln.vul_name.trim() || !newVuln.problem_description.trim() || !newVuln.vul_modify_repair.trim()) {
      toast.error('请填写完整的漏洞信息');
      return;
    }

    // 检查是否已存在
    if (vulnDB.some(v => v.vul_name === newVuln.vul_name.trim())) {
      toast.error('该漏洞名称已存在');
      return;
    }

    try {
      await addVulnData({
        vul_name: newVuln.vul_name.trim(),
        problem_description: newVuln.problem_description.trim(),
        vul_modify_repair: newVuln.vul_modify_repair.trim()
      });
      toast.success('漏洞信息已添加');
      setNewVuln({ vul_name: '', problem_description: '', vul_modify_repair: '' });
      setShowCreateForm(false);
    } catch (error) {
      toast.error('添加漏洞信息失败');
      console.error('Failed to add vulnerability:', error);
    }
  };

  // 开始编辑
  const startEdit = (vuln: VulnData) => {
    setEditingVuln(vuln.vul_name);
    setEditingData({ ...vuln });
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingData.vul_name.trim() || !editingData.problem_description.trim() || !editingData.vul_modify_repair.trim()) {
      toast.error('请填写完整的漏洞信息');
      return;
    }

    try {
      // 如果名称改变，先删除旧的再添加新的
      if (editingVuln && editingVuln !== editingData.vul_name.trim()) {
        await removeVulnData(editingVuln);
      }
      
      await addVulnData({
        vul_name: editingData.vul_name.trim(),
        problem_description: editingData.problem_description.trim(),
        vul_modify_repair: editingData.vul_modify_repair.trim()
      });
      
      toast.success('漏洞信息已更新');
      setEditingVuln(null);
      setEditingData({ vul_name: '', problem_description: '', vul_modify_repair: '' });
    } catch (error) {
      toast.error('更新漏洞信息失败');
      console.error('Failed to update vulnerability:', error);
    }
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingVuln(null);
    setEditingData({ vul_name: '', problem_description: '', vul_modify_repair: '' });
  };

  // 删除漏洞
  const handleDelete = async (vulnName: string) => {
    try {
      await removeVulnData(vulnName);
      toast.success('漏洞信息已删除');
      
      // 如果正在编辑被删除的漏洞，取消编辑状态
      if (editingVuln === vulnName) {
        cancelEdit();
      }
    } catch (error) {
      toast.error('删除漏洞信息失败');
      console.error('Failed to delete vulnerability:', error);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6" data-tauri-drag-region>
        <h2 className="text-2xl font-bold select-none" data-tauri-drag-region>
          <SidebarTrigger />漏洞数据库管理
        </h2>
      </div>

      <div className="space-y-6">
        <p className="text-muted-foreground select-none">
          管理漏洞名称、问题描述和修复建议。这些数据将在创建报告时自动填充相关信息。
        </p>

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>总计: {vulnDB.length} 个漏洞</span>
          {filteredVulns.length !== vulnDB.length && (
            <span>筛选结果: {filteredVulns.length} 个</span>
          )}
        </div>

        {/* 搜索和创建按钮 */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="搜索漏洞名称或描述..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-4 w-4 mr-2" />
            添加漏洞
          </Button>
        </div>

        {/* 创建表单 */}
        {showCreateForm && (
          <div className="border rounded-lg p-4 bg-muted/30">
            <h3 className="text-lg font-medium mb-4">添加新漏洞</h3>
            <div className="space-y-4">
              <div>
                <Label htmlFor="new-vuln-name">漏洞名称</Label>
                <Input
                  id="new-vuln-name"
                  placeholder="输入漏洞名称..."
                  value={newVuln.vul_name}
                  onChange={(e) => setNewVuln(prev => ({ ...prev, vul_name: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-vuln-description">问题描述</Label>
                <Textarea
                  id="new-vuln-description"
                  placeholder="描述该漏洞的具体问题..."
                  rows={3}
                  value={newVuln.problem_description}
                  onChange={(e) => setNewVuln(prev => ({ ...prev, problem_description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="new-vuln-solution">修复建议</Label>
                <Textarea
                  id="new-vuln-solution"
                  placeholder="提供修复该漏洞的建议..."
                  rows={3}
                  value={newVuln.vul_modify_repair}
                  onChange={(e) => setNewVuln(prev => ({ ...prev, vul_modify_repair: e.target.value }))}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowCreateForm(false);
                  setNewVuln({ vul_name: '', problem_description: '', vul_modify_repair: '' });
                }}>
                  取消
                </Button>
                <Button onClick={handleCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  添加
                </Button>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* 漏洞列表 */}
        <div className="space-y-4">
          {filteredVulns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {vulnDB.length === 0 ? '暂无漏洞数据' : '没有找到匹配的漏洞'}
            </div>
          ) : (
            filteredVulns.map((vuln) => (
              <VulnCard
                key={vuln.vul_name}
                vuln={vuln}
                isEditing={editingVuln === vuln.vul_name}
                editingData={editingData}
                onEdit={startEdit}
                onSave={handleSaveEdit}
                onCancel={cancelEdit}
                onDelete={() => handleDelete(vuln.vul_name)}
                onEditingDataChange={setEditingData}
              />
            ))
          )}
        </div>


      </div>
    </div>
  );
}

// 漏洞卡片组件
interface VulnCardProps {
  vuln: VulnData;
  isEditing: boolean;
  editingData: VulnData;
  onEdit: (vuln: VulnData) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onEditingDataChange: (data: VulnData) => void;
}

function VulnCard({ 
  vuln, 
  isEditing, 
  editingData, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete,
  onEditingDataChange 
}: VulnCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isEditing) {
    return (
      <div className="border rounded-lg p-4 bg-blue-50/50 dark:bg-blue-950/20">
        <div className="space-y-4">
          <div>
            <Label htmlFor="edit-vuln-name">漏洞名称</Label>
            <Input
              id="edit-vuln-name"
              value={editingData.vul_name}
              onChange={(e) => onEditingDataChange({ ...editingData, vul_name: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-vuln-description">问题描述</Label>
            <Textarea
              id="edit-vuln-description"
              rows={3}
              value={editingData.problem_description}
              onChange={(e) => onEditingDataChange({ ...editingData, problem_description: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="edit-vuln-solution">修复建议</Label>
            <Textarea
              id="edit-vuln-solution"
              rows={3}
              value={editingData.vul_modify_repair}
              onChange={(e) => onEditingDataChange({ ...editingData, vul_modify_repair: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancel}>
              取消
            </Button>
            <Button onClick={onSave}>
              <Save className="h-4 w-4 mr-2" />
              保存
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 hover:bg-muted/30 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-lg">{vuln.vul_name}</h3>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(vuln)}
              >
                <Edit2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="h-auto p-0 text-left font-normal mt-2">
                <div className="flex items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="text-sm text-muted-foreground">
                    {isExpanded ? '收起详情' : '展开详情'}
                  </span>
                </div>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-3 mt-3">
              <div>
                <Label className="text-sm font-medium text-muted-foreground">问题描述</Label>
                <div className="mt-1 text-sm p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                  {vuln.problem_description}
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium text-muted-foreground">修复建议</Label>
                <div className="mt-1 text-sm p-3 bg-muted/50 rounded-md whitespace-pre-wrap">
                  {vuln.vul_modify_repair}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>
    </div>
  );
} 