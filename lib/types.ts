// 截图内容类型，支持文本说明和图片数据
export type ScreenshotContent = 
  | { type: 'text'; content: string }      // 文本说明
  | { type: 'image'; content: Uint8Array }; // 图片数据

// 风险隐患报告数据结构
export interface RiskReportData {
    id: string; // 内部唯一ID，用作主键
    hazard_type: string;
    report_name: string;
    hazard_level: string;
    report_id: string; // 用户输入的业务编号
    target: string;
    vul_name: string;
    warning_level: string;
    city: string;
    unit_type: string;
    industry: string;
    customer_company_name: string;
    website_name: string;
    domain: string;
    ip_address: string;
    case_number: string;
    report_time: string;
    problem_description: string;
    vul_modify_repair: string;
    evidence_screenshots: ScreenshotContent[]; // 支持多张证据截图（文本或图片）
    filing_screenshots: ScreenshotContent[];   // 支持多张备案截图（文本或图片）
    remark: string;
}

export interface ReportProject {
    projectName: string;
    reportList: RiskReportData[];
} 