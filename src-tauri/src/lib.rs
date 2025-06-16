use crate::report::RiskReportData;
use tauri::webview::WebviewWindowBuilder;
use tauri::Manager;
use tauri_plugin_dialog::DialogExt;

pub mod report;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("报告列表为空，无法生成文档")]
    EmptyReportList,
    #[error("文档生成失败: {0}")]
    DocumentGeneration(String),
    #[error("文件保存失败: {0}")]
    FileSave(String),
    #[error("用户取消了保存操作")]
    UserCancelled,
    #[error("IO错误: {0}")]
    Io(#[from] std::io::Error),
}

impl From<AppError> for String {
    fn from(error: AppError) -> Self {
        error.to_string()
    }
}

#[tauri::command]
async fn generate(
    project_name: &str,
    report_list: Vec<RiskReportData>,
    app: tauri::AppHandle,
) -> Result<String, String> {
    log::info!(
        "开始生成报告，项目名称: {}, 报告数量: {}",
        project_name,
        report_list.len()
    );

    // 验证输入
    if project_name.trim().is_empty() {
        return Err("项目名称不能为空".to_string());
    }

    if report_list.is_empty() {
        return Err(AppError::EmptyReportList.to_string());
    }

    // 验证报告数据完整性
    for (index, report) in report_list.iter().enumerate() {
        if report.report_id.trim().is_empty() {
            return Err(format!("第{}个报告的隐患编号不能为空", index + 1));
        }
    }

    log::info!("报告数据验证通过，开始构建文档");

    // 创建DocxBuilder并设置基本配置
    let mut builder = report::DocxBuilder::new().with_title_font_size(24);

    // 遍历报告列表，为每个报告添加内容
    for (index, report) in report_list.iter().enumerate() {
        log::debug!("处理第{}个报告: {}", index + 1, report.report_name);

        // 添加报告标题：【隐患类型】隐患名称 【隐患级别】
        let title = format!(
            "【{}】{} 【{}】",
            report.hazard_type, report.report_name, report.hazard_level
        );
        builder = builder.add_title(title);

        // 添加风险表格
        builder = builder.add_risk_table(report.clone());

        // 如果不是最后一个报告，添加分页符
        if index < report_list.len() - 1 {
            builder = builder.add_page_break();
        }
    }

    log::info!("文档构建完成，开始保存文件");

    // 生成安全的文件名：项目名称_风险隐患报告.docx
    let safe_project_name = sanitize_filename(project_name);
    let file_name = format!("{}_风险隐患报告.docx", safe_project_name);

    // 显示保存对话框
    let file_path = app
        .dialog()
        .file()
        .set_file_name(file_name.clone())
        .blocking_save_file();

    match file_path {
        Some(path) => {
            let path_str = path.to_string();
            log::info!("用户选择保存路径: {}", path_str);

            match builder.save_to_file(&path_str) {
                Ok(_) => {
                    log::info!("报告生成成功: {}", path_str);
                    Ok(format!("成功生成报告：{}", path_str))
                }
                Err(e) => {
                    log::error!("保存文件失败: {}", e);
                    Err(AppError::FileSave(e.to_string()).to_string())
                }
            }
        }
        None => {
            log::warn!("用户取消了保存操作");
            Err(AppError::UserCancelled.to_string())
        }
    }
}

#[tauri::command]
async fn open_icp_query_window(handle: tauri::AppHandle) -> Result<(), String> {
    let window = handle.get_webview_window("beian");
    if window.is_some() {
        window.unwrap().set_focus().map_err(|e| e.to_string())?;
        tokio::time::sleep(std::time::Duration::from_millis(200)).await;
        return Ok(());
    };
    WebviewWindowBuilder::new(
        &handle,
        "beian",
        tauri::WebviewUrl::External("https://beian.miit.gov.cn/".parse().unwrap()),
    )
    .title("备案查询")
    .inner_size(1200.0, 800.0)
    .build()
    .map_err(|e| e.to_string())?;
    log::info!("打开备案查询窗口成功");
    Ok(())
}

/// 清理文件名中的非法字符
fn sanitize_filename(filename: &str) -> String {
    // 移除或替换文件名中的非法字符
    filename
        .chars()
        .map(|c| match c {
            '<' | '>' | ':' | '"' | '|' | '?' | '*' | '\\' | '/' => '_',
            c if c.is_control() => '_',
            c => c,
        })
        .collect::<String>()
        .trim()
        .to_string()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // 初始化日志
    env_logger::Builder::from_default_env()
        .filter_level(log::LevelFilter::Info)
        .init();

    log::info!("启动应用程序");

    tauri::Builder::default()
        .plugin(tauri_plugin_clipboard::init())
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            log::debug!("检测到单实例，聚焦主窗口");
            let _ = app
                .get_webview_window("main")
                .expect("no main window")
                .set_focus();
        }))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_persisted_scope::init())
        .invoke_handler(tauri::generate_handler![generate, open_icp_query_window])
        .setup(|_app| {
            log::info!("应用程序设置完成");
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
