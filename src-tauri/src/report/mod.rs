use docx_rs::*;
use serde::{Deserialize, Serialize};
mod img_util;
/// 截图内容类型，支持文本说明和图片数据
#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(tag = "type", content = "content")]
pub enum ScreenshotContent {
    #[serde(rename = "text")]
    Text(String), // 文本说明
    #[serde(rename = "image")]
    Image(Vec<u8>), // 图片数据
}

/// 风险隐患报告数据结构
#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct RiskReportData {
    pub id: String,
    pub hazard_type: String,
    pub report_name: String,
    pub hazard_level: String,
    pub report_id: String,
    pub target: String,
    pub vul_name: String,
    pub warning_level: String,
    pub city: String,
    pub unit_type: String,
    pub industry: String,
    pub customer_company_name: String,
    pub website_name: String,
    pub domain: String,
    pub ip_address: String,
    pub case_number: String,
    pub report_time: String,
    pub problem_description: String,
    pub vul_modify_repair: String,
    pub evidence_screenshots: Vec<ScreenshotContent>, // 支持多张证据截图（文本或图片）
    pub filing_screenshots: Vec<ScreenshotContent>,   // 支持多张备案截图（文本或图片）
    pub remark: String,
}

/// 文档内容项，可以是标题或表格
#[derive(Debug, Clone)]
pub enum DocumentItem {
    Title(String),                          // 标题文本
    RiskTable(RiskReportData, Option<f32>), // 风险隐患表格 (数据, 可选行高)
    PageBreak,                              // 分页符
}

/// 风险隐患表格构建器
pub struct RiskTableBuilder {
    data: RiskReportData,
    base_row_height: f32,
}

impl RiskTableBuilder {
    /// 创建新的表格构建器
    pub fn new(data: RiskReportData) -> Self {
        Self {
            data,
            base_row_height: 500.0,
        }
    }

    /// 设置基础行高
    pub fn with_base_row_height(mut self, height: f32) -> Self {
        self.base_row_height = height;
        self
    }

    /// 创建表格标题行 -- 风险隐患
    fn create_table_header(&self) -> TableRow {
        TableRow::new(vec![TableCell::new()
            .add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text("风险隐患").bold())
                    .align(AlignmentType::Center),
            )
            .grid_span(4)
            .vertical_align(VAlignType::Center)])
        .row_height(self.base_row_height)
    }

    /// 创建两列数据行
    fn create_two_column_row(
        &self,
        label1: &str,
        value1: &str,
        label2: &str,
        value2: &str,
    ) -> TableRow {
        TableRow::new(vec![
            TableCell::new()
                .add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(label1).bold())
                        .align(AlignmentType::Center),
                )
                .width(1500, WidthType::Dxa)
                .vertical_align(VAlignType::Center),
            TableCell::new()
                .add_paragraph(
                    Paragraph::new()
                        .add_run(
                            Run::new()
                                .add_text(value1)
                                .fonts(RunFonts::new().ascii("仿宋")),
                        )
                        .align(AlignmentType::Center),
                )
                .width(2500, WidthType::Dxa)
                .vertical_align(VAlignType::Center),
            TableCell::new()
                .add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(label2).bold())
                        .align(AlignmentType::Center),
                )
                .width(1500, WidthType::Dxa)
                .vertical_align(VAlignType::Center),
            TableCell::new()
                .add_paragraph(
                    Paragraph::new()
                        .add_run(
                            Run::new()
                                .add_text(value2)
                                .fonts(RunFonts::new().ascii("仿宋")),
                        )
                        .align(AlignmentType::Center),
                )
                .width(2500, WidthType::Dxa)
                .vertical_align(VAlignType::Center),
        ])
        .row_height(self.base_row_height)
    }

    /// 创建单列数据行（跨4列）
    fn create_single_column_row(&self, label: &str, value: &str) -> TableRow {
        TableRow::new(vec![
            TableCell::new()
                .add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(label).bold())
                        .align(AlignmentType::Center),
                )
                .vertical_align(VAlignType::Center),
            TableCell::new()
                .add_paragraph(
                    Paragraph::new()
                        .add_run(
                            Run::new()
                                .add_text(value)
                                .fonts(RunFonts::new().ascii("仿宋")),
                        )
                        .align(AlignmentType::Center),
                )
                .grid_span(3)
                .vertical_align(VAlignType::Center),
        ])
        .row_height(self.base_row_height)
    }

    /// 创建图片行（标题行）
    fn create_image_title_row(&self, title: &str) -> TableRow {
        TableRow::new(vec![TableCell::new()
            .add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text(title).bold())
                    .align(AlignmentType::Center),
            )
            .grid_span(4)
            .vertical_align(VAlignType::Center)])
        .row_height(self.base_row_height)
    }

    /// 创建截图内容行（支持文本和图片混合）
    fn create_screenshot_content_row(&self, contents: &[ScreenshotContent]) -> TableRow {
        let mut paragraph = Paragraph::new();

        if contents.is_empty() {
            // 如果没有内容，显示占位符
            paragraph =
                paragraph.add_run(Run::new().add_text("").fonts(RunFonts::new().ascii("仿宋")));
        } else {
            // 处理所有内容项
            for (index, content) in contents.iter().enumerate() {
                match content {
                    ScreenshotContent::Text(text) => {
                        // 添加文本内容
                        paragraph = paragraph.add_run(
                            Run::new()
                                .add_text(text)
                                .fonts(RunFonts::new().ascii("仿宋")),
                        );
                    }
                    ScreenshotContent::Image(image_data) => {
                        // 添加图片，保持宽度为520*9525并按原图比例计算高度
                        let target_width_emu = 520 * 9525;
                        let (width_emu, height_emu) =
                            match img_util::get_image_dimensions(image_data) {
                                Ok((orig_width, orig_height)) => {
                                    img_util::calculate_proportional_size(
                                        target_width_emu,
                                        orig_width,
                                        orig_height,
                                    )
                                }
                                Err(e) => {
                                    log::warn!("无法获取图片尺寸: {}, 使用默认比例", e);
                                    // 如果无法获取图片尺寸，使用默认比例(16:9)
                                    (target_width_emu, target_width_emu * 9 / 16)
                                }
                            };

                        let pic = Pic::new(image_data).size(width_emu, height_emu);
                        paragraph = paragraph.add_run(Run::new().add_image(pic));
                    }
                }

                // 在内容项之间添加换行（除了最后一项）
                if index < contents.len() - 1 {
                    paragraph = paragraph.add_run(Run::new().add_break(BreakType::TextWrapping));
                }
            }
        }

        TableRow::new(vec![TableCell::new()
            .add_paragraph(paragraph)
            .grid_span(4)
            .vertical_align(VAlignType::Center)])
        .row_height(self.base_row_height * 2.0)
    }

    /// 创建备注行
    fn create_remark_row(&self) -> TableRow {
        TableRow::new(vec![TableCell::new()
            .add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text("备注").bold())
                    .align(AlignmentType::Center),
            )
            .grid_span(4)
            .vertical_align(VAlignType::Center)])
        .row_height(self.base_row_height)
    }

    /// 创建备注内容行
    fn create_remark_content_row(&self) -> TableRow {
        TableRow::new(vec![TableCell::new()
            .add_paragraph(
                Paragraph::new()
                    .add_run(
                        Run::new()
                            .add_text(&self.data.remark)
                            .fonts(RunFonts::new().ascii("仿宋")),
                    )
                    .indent(
                        None,                                    // left: 左缩进
                        Some(SpecialIndentType::FirstLine(567)), // special_indent: 首行缩进2字符
                        None,                                    // end: 右缩进
                        None,                                    // start_chars: 字符单位的起始缩进
                    ),
            )
            .grid_span(4)
            .vertical_align(VAlignType::Center)])
        .row_height(self.base_row_height)
    }

    /// 生成完整的表格
    pub fn build_table(&self) -> Table {
        let mut table = Table::new(vec![self.create_table_header()]);

        // 添加基本信息行
        table = table.add_row(self.create_two_column_row(
            "隐患编号",
            &self.data.report_id,
            "隐患名称",
            &self.data.report_name,
        ));

        table = table.add_row(self.create_single_column_row("隐患URL", &self.data.target));

        table = table.add_row(self.create_two_column_row(
            "隐患类型",
            &self.data.vul_name,
            "隐患级别",
            &self.data.hazard_level,
        ));

        table = table.add_row(self.create_two_column_row(
            "预警级别",
            &self.data.warning_level,
            "归属地市",
            &self.data.city,
        ));

        table = table.add_row(self.create_two_column_row(
            "单位类型",
            &self.data.unit_type,
            "所属行业",
            &self.data.industry,
        ));

        table = table.add_row(self.create_two_column_row(
            "单位名称",
            &self.data.customer_company_name,
            "网站名称",
            &self.data.website_name,
        ));

        table = table.add_row(self.create_two_column_row(
            "网站域名",
            &self.data.domain,
            "网站IP",
            &self.data.ip_address,
        ));

        table = table.add_row(self.create_two_column_row(
            "工信备案号",
            &self.data.case_number,
            "发现时间",
            &self.data.report_time,
        ));

        table = table
            .add_row(self.create_single_column_row("问题描述", &self.data.problem_description));

        table =
            table.add_row(self.create_single_column_row("整改建议", &self.data.vul_modify_repair));

        // 添加证据截图
        table = table.add_row(self.create_image_title_row("证据截图"));
        table = table.add_row(self.create_screenshot_content_row(&self.data.evidence_screenshots));

        // 添加工信域名备案截图
        table = table.add_row(self.create_image_title_row("工信域名备案截图"));
        table = table.add_row(self.create_screenshot_content_row(&self.data.filing_screenshots));

        // 添加备注
        table = table.add_row(self.create_remark_row());
        table = table.add_row(self.create_remark_content_row());

        // 设置表格样式
        table
            .width(8000, WidthType::Dxa)
            .align(TableAlignmentType::Center)
    }
}

/// 文档构建器 - 处理多个标题和表格的组合
pub struct DocxBuilder {
    items: Vec<DocumentItem>,
    title_font_size: usize,
}

impl DocxBuilder {
    /// 创建新的文档构建器
    pub fn new() -> Self {
        Self {
            items: Vec::new(),
            title_font_size: 24,
        }
    }

    /// 设置标题字体大小
    pub fn with_title_font_size(mut self, size: usize) -> Self {
        self.title_font_size = size;
        self
    }

    /// 添加标题
    pub fn add_title(mut self, title: String) -> Self {
        self.items.push(DocumentItem::Title(title));
        self
    }

    /// 添加风险隐患表格
    pub fn add_risk_table(mut self, data: RiskReportData) -> Self {
        self.items.push(DocumentItem::RiskTable(data, None));
        self
    }

    /// 添加带自定义行高的风险隐患表格
    pub fn add_risk_table_with_height(mut self, data: RiskReportData, row_height: f32) -> Self {
        self.items
            .push(DocumentItem::RiskTable(data, Some(row_height)));
        self
    }

    /// 添加分页符
    pub fn add_page_break(mut self) -> Self {
        self.items.push(DocumentItem::PageBreak);
        self
    }

    /// 创建标题段落
    fn create_title_paragraph(&self, title: &str) -> Paragraph {
        Paragraph::new()
            .add_run(
                Run::new()
                    .add_text(title)
                    .size(self.title_font_size)
                    .bold()
                    .fonts(RunFonts::new().ascii("楷体")),
            )
            .align(AlignmentType::Center)
    }

    /// 构建完整文档
    pub fn build(self) -> Docx {
        let mut docx = Docx::new();

        for (index, item) in self.items.iter().enumerate() {
            match item {
                DocumentItem::Title(title) => {
                    // 添加标题
                    docx = docx.add_paragraph(self.create_title_paragraph(title));

                    // 在标题后添加空行
                    docx = docx.add_paragraph(Paragraph::new());
                }
                DocumentItem::RiskTable(data, row_height) => {
                    // 创建表格，如果有自定义行高则使用，否则使用默认值
                    let mut table_builder = RiskTableBuilder::new(data.clone());
                    if let Some(height) = row_height {
                        table_builder = table_builder.with_base_row_height(*height);
                    }
                    let table = table_builder.build_table();
                    docx = docx.add_table(table);

                    // 在表格后添加空行（除非是最后一项）
                    if index < self.items.len() - 1 {
                        docx = docx.add_paragraph(Paragraph::new());
                    }
                }
                DocumentItem::PageBreak => {
                    // 添加分页符
                    docx = docx.add_paragraph(
                        Paragraph::new().add_run(Run::new().add_break(BreakType::Page)),
                    );
                }
            }
        }

        docx
    }

    /// 保存文档到文件
    pub fn save_to_file(self, path: &str) -> Result<(), Box<dyn std::error::Error>> {
        let file = std::fs::File::create(path)?;
        let docx = self.build();
        docx.build().pack(file)?;
        Ok(())
    }
}
