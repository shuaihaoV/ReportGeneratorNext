/// 图片处理相关的错误类型
#[derive(Debug, thiserror::Error)]
pub enum ImageError {
    #[error("不支持的图片格式")]
    UnsupportedFormat,
    #[error("图片数据损坏或不完整")]
    CorruptedData,
    #[error("图片尺寸无效")]
    InvalidDimensions,
}

/// 图片格式枚举
#[derive(Debug, Clone, Copy)]
pub enum ImageFormat {
    Png,
    Jpeg,
    Gif,
    Webp,
    Bmp,
}

impl ImageFormat {
    /// 从文件签名识别图片格式
    pub fn from_signature(data: &[u8]) -> Option<Self> {
        if data.len() < 8 {
            return None;
        }

        // PNG: 89 50 4E 47 0D 0A 1A 0A
        if data.starts_with(&[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) {
            return Some(ImageFormat::Png);
        }

        // JPEG: FF D8 FF
        if data.starts_with(&[0xFF, 0xD8, 0xFF]) {
            return Some(ImageFormat::Jpeg);
        }

        // GIF: 47 49 46 38 (GIF8)
        if data.starts_with(&[0x47, 0x49, 0x46, 0x38]) {
            return Some(ImageFormat::Gif);
        }

        // WebP: 52 49 46 46 ... 57 45 42 50 (RIFF...WEBP)
        if data.len() >= 12
            && data.starts_with(&[0x52, 0x49, 0x46, 0x46])
            && data[8..12] == [0x57, 0x45, 0x42, 0x50]
        {
            return Some(ImageFormat::Webp);
        }

        // BMP: 42 4D (BM)
        if data.starts_with(&[0x42, 0x4D]) {
            return Some(ImageFormat::Bmp);
        }

        None
    }
}

/// 获取图片尺寸信息
/// 返回值: Result<(width, height), ImageError> 以像素为单位
pub fn get_image_dimensions(image_data: &[u8]) -> Result<(u32, u32), ImageError> {
    if image_data.is_empty() {
        return Err(ImageError::CorruptedData);
    }

    let format = ImageFormat::from_signature(image_data).ok_or(ImageError::UnsupportedFormat)?;

    match format {
        ImageFormat::Png => get_png_dimensions(image_data),
        ImageFormat::Jpeg => get_jpeg_dimensions(image_data),
        ImageFormat::Gif => get_gif_dimensions(image_data),
        ImageFormat::Webp => get_webp_dimensions(image_data),
        ImageFormat::Bmp => get_bmp_dimensions(image_data),
    }
}

/// 获取PNG图片尺寸
fn get_png_dimensions(data: &[u8]) -> Result<(u32, u32), ImageError> {
    if data.len() < 24 {
        return Err(ImageError::CorruptedData);
    }

    if let Some(ihdr_pos) = find_png_ihdr(data) {
        if ihdr_pos + 16 > data.len() {
            return Err(ImageError::CorruptedData);
        }

        let width = u32::from_be_bytes([
            data[ihdr_pos + 8],
            data[ihdr_pos + 9],
            data[ihdr_pos + 10],
            data[ihdr_pos + 11],
        ]);
        let height = u32::from_be_bytes([
            data[ihdr_pos + 12],
            data[ihdr_pos + 13],
            data[ihdr_pos + 14],
            data[ihdr_pos + 15],
        ]);

        if width == 0 || height == 0 {
            return Err(ImageError::InvalidDimensions);
        }

        Ok((width, height))
    } else {
        Err(ImageError::CorruptedData)
    }
}

/// 查找PNG的IHDR块位置
fn find_png_ihdr(data: &[u8]) -> Option<usize> {
    let mut pos = 8; // 跳过PNG文件头
    while pos + 8 < data.len() {
        if pos + 8 > data.len() {
            break;
        }

        let chunk_len =
            u32::from_be_bytes([data[pos], data[pos + 1], data[pos + 2], data[pos + 3]]) as usize;

        if pos + 8 > data.len() {
            break;
        }

        if &data[pos + 4..pos + 8] == b"IHDR" {
            return Some(pos);
        }

        // 防止无限循环和整数溢出
        if chunk_len > data.len() || pos > data.len() - 12 - chunk_len {
            break;
        }

        pos += 8 + chunk_len + 4; // 8字节头 + 数据 + 4字节CRC
    }
    None
}

/// 获取JPEG图片尺寸
fn get_jpeg_dimensions(data: &[u8]) -> Result<(u32, u32), ImageError> {
    if data.len() < 4 || data[0..2] != [0xFF, 0xD8] {
        return Err(ImageError::UnsupportedFormat);
    }

    let mut pos = 2; // 跳过SOI标记

    while pos < data.len() - 1 {
        if data[pos] != 0xFF {
            break;
        }

        let marker = data[pos + 1];
        pos += 2;

        // SOF0, SOF1, SOF2等标记包含图片尺寸信息
        if (0xC0..=0xC3).contains(&marker)
            || (0xC5..=0xC7).contains(&marker)
            || (0xC9..=0xCB).contains(&marker)
            || (0xCD..=0xCF).contains(&marker)
        {
            if pos + 5 >= data.len() {
                return Err(ImageError::CorruptedData);
            }

            let height = u16::from_be_bytes([data[pos + 3], data[pos + 4]]) as u32;
            let width = u16::from_be_bytes([data[pos + 5], data[pos + 6]]) as u32;

            if width == 0 || height == 0 {
                return Err(ImageError::InvalidDimensions);
            }

            return Ok((width, height));
        }

        // 跳过当前段
        if pos + 2 > data.len() {
            break;
        }

        let segment_len = u16::from_be_bytes([data[pos], data[pos + 1]]) as usize;
        if segment_len < 2 || pos > data.len() - segment_len {
            break;
        }

        pos += segment_len;
    }

    Err(ImageError::CorruptedData)
}

/// 获取GIF图片尺寸
fn get_gif_dimensions(data: &[u8]) -> Result<(u32, u32), ImageError> {
    if data.len() < 10 {
        return Err(ImageError::CorruptedData);
    }

    // GIF尺寸在字节6-9位置，小端序
    let width = u16::from_le_bytes([data[6], data[7]]) as u32;
    let height = u16::from_le_bytes([data[8], data[9]]) as u32;

    if width == 0 || height == 0 {
        return Err(ImageError::InvalidDimensions);
    }

    Ok((width, height))
}

/// 获取WebP图片尺寸
fn get_webp_dimensions(data: &[u8]) -> Result<(u32, u32), ImageError> {
    if data.len() < 30 {
        return Err(ImageError::CorruptedData);
    }

    // 跳过RIFF和WEBP头部（12字节）
    let mut pos = 12;

    // 查找VP8或VP8L块
    while pos + 8 < data.len() {
        let chunk_type = &data[pos..pos + 4];
        let chunk_size =
            u32::from_le_bytes([data[pos + 4], data[pos + 5], data[pos + 6], data[pos + 7]])
                as usize;

        pos += 8;

        if chunk_type == b"VP8 " {
            if pos + 10 > data.len() {
                return Err(ImageError::CorruptedData);
            }

            // VP8格式的尺寸解析
            let width = ((data[pos + 6] as u32) | ((data[pos + 7] as u32) << 8)) & 0x3FFF;
            let height = ((data[pos + 8] as u32) | ((data[pos + 9] as u32) << 8)) & 0x3FFF;

            if width == 0 || height == 0 {
                return Err(ImageError::InvalidDimensions);
            }

            return Ok((width, height));
        } else if chunk_type == b"VP8L" {
            if pos + 5 > data.len() {
                return Err(ImageError::CorruptedData);
            }

            // VP8L格式的尺寸解析
            let bits =
                u32::from_le_bytes([data[pos + 1], data[pos + 2], data[pos + 3], data[pos + 4]]);

            let width = (bits & 0x3FFF) + 1;
            let height = ((bits >> 14) & 0x3FFF) + 1;

            return Ok((width, height));
        }

        if pos > data.len() - chunk_size {
            break;
        }

        pos += chunk_size;
        if chunk_size % 2 == 1 {
            pos += 1; // 字节对齐
        }
    }

    Err(ImageError::CorruptedData)
}

/// 获取BMP图片尺寸
fn get_bmp_dimensions(data: &[u8]) -> Result<(u32, u32), ImageError> {
    if data.len() < 26 {
        return Err(ImageError::CorruptedData);
    }

    // BMP尺寸在字节18-25位置，小端序
    let width = u32::from_le_bytes([data[18], data[19], data[20], data[21]]);
    let height = u32::from_le_bytes([data[22], data[23], data[24], data[25]]);

    if width == 0 || height == 0 {
        return Err(ImageError::InvalidDimensions);
    }

    Ok((width, height))
}

/// 计算保持比例的图片尺寸
/// target_width: 目标宽度（以EMU为单位，1像素 ≈ 9525 EMU）
/// original_width, original_height: 原始图片尺寸（像素）
/// 返回: (width_emu, height_emu)
pub fn calculate_proportional_size(
    target_width_emu: u32,
    original_width: u32,
    original_height: u32,
) -> (u32, u32) {
    if original_width == 0 || original_height == 0 {
        // 如果无法获取原始尺寸，使用默认比例(16:9)
        return (target_width_emu, target_width_emu * 9 / 16);
    }

    // 计算比例
    let aspect_ratio = original_height as f64 / original_width as f64;
    let target_height_emu = (target_width_emu as f64 * aspect_ratio) as u32;

    // 防止图片过高
    let max_height = target_width_emu * 2; // 最大高度为宽度的2倍
    if target_height_emu > max_height {
        (
            target_width_emu * original_width / original_height,
            max_height,
        )
    } else {
        (target_width_emu, target_height_emu)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_image_format_detection() {
        // PNG signature
        let png_data = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        assert!(matches!(
            ImageFormat::from_signature(&png_data),
            Some(ImageFormat::Png)
        ));

        // JPEG signature (需要至少8字节)
        let jpeg_data = [0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46];
        assert!(matches!(
            ImageFormat::from_signature(&jpeg_data),
            Some(ImageFormat::Jpeg)
        ));

        // GIF signature
        let gif_data = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x00, 0x00];
        assert!(matches!(
            ImageFormat::from_signature(&gif_data),
            Some(ImageFormat::Gif)
        ));

        // WebP signature
        let webp_data = [0x52, 0x49, 0x46, 0x46, 0x28, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50];
        assert!(matches!(
            ImageFormat::from_signature(&webp_data),
            Some(ImageFormat::Webp)
        ));

        // BMP signature
        let bmp_data = [0x42, 0x4D, 0x36, 0x00, 0x00, 0x00, 0x00, 0x00];
        assert!(matches!(
            ImageFormat::from_signature(&bmp_data),
            Some(ImageFormat::Bmp)
        ));

        // Invalid data (less than 8 bytes)
        let invalid_data = [0x00, 0x00, 0x00, 0x00];
        assert!(ImageFormat::from_signature(&invalid_data).is_none());

        // Invalid data (8 bytes but unknown format)
        let unknown_data = [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00];
        assert!(ImageFormat::from_signature(&unknown_data).is_none());
    }

    #[test]
    fn test_calculate_proportional_size() {
        // 16:9比例
        let (width, height) = calculate_proportional_size(1920 * 9525, 1920, 1080);
        assert_eq!(width, 1920 * 9525);
        assert_eq!(height, 1080 * 9525);

        // 无效尺寸
        let (width, height) = calculate_proportional_size(1920 * 9525, 0, 0);
        assert_eq!(width, 1920 * 9525);
        assert_eq!(height, 1920 * 9525 * 9 / 16);
    }
}
