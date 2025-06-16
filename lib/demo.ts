import { RiskReportData, ReportProject } from './types';

// 生成演示报告数据
export const generateDemoReport = (index: number = 1): RiskReportData => ({
  id: `demo_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`, // 内部唯一ID
  report_id: `DEMO-${String(index).padStart(3, '0')}`, // 用户业务编号
  hazard_type: '漏洞报告',
  report_name: `演示报告 ${index}`,
  hazard_level: ['低危', '中危', '高危', '严重'][Math.floor(Math.random() * 4)],
  target: `目标系统 ${index}`,
  vul_name: `SQL注入漏洞_${index}`,
  warning_level: ['低', '中', '高'][Math.floor(Math.random() * 3)],
  city: '北京',
  unit_type: '企业',
  industry: '信息技术',
  customer_company_name: `演示公司 ${index}`,
  website_name: `演示网站 ${index}`,
  domain: `demo${index}.example.com`,
  ip_address: `192.168.1.${100 + index}`,
  case_number: `CASE-2024-${String(index).padStart(4, '0')}`,
  report_time: new Date().toISOString().split('T')[0],
  problem_description: `这是一个演示报告 ${index} 的问题描述。该系统存在SQL注入风险，攻击者可能利用此漏洞获取数据库敏感信息。`,
  vul_modify_repair: `建议立即修复SQL注入漏洞：\n1. 使用参数化查询\n2. 输入验证和过滤\n3. 最小权限原则\n4. 定期安全审计`,
  evidence_screenshots: [
    { type: 'text', content: `证据截图 ${index}-1: 漏洞验证截图` },
    { type: 'text', content: `证据截图 ${index}-2: 攻击payload截图` }
  ],
  filing_screenshots: [
    { type: 'text', content: `备案截图 ${index}-1: 系统备案信息` }
  ],
  remark: `演示报告 ${index} 的备注信息`
});

// 生成演示项目
export const generateDemoProject = (name: string, reportCount: number = 3): ReportProject => ({
  projectName: name,
  reportList: Array.from({ length: reportCount }, (_, i) => generateDemoReport(i + 1))
});

// 常用的演示数据
export const demoProjects = [
  generateDemoProject('演示项目A', 2),
  generateDemoProject('演示项目B', 3),
  generateDemoProject('企业安全评估', 1)
]; 