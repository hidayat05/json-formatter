use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use image::{GenericImageView, ImageFormat, Rgba};
use log::info;
use std::collections::VecDeque;
use std::io::Cursor;

/// Remove background using flood-fill algorithm from edges
#[tauri::command]
pub fn remove_background(image_data: String, tolerance: u32) -> Result<String, String> {
    info!("remove_background called with tolerance: {}", tolerance);

    // Decode base64 image
    let image_data_str = if image_data.contains(',') {
        image_data.split(',').nth(1).unwrap_or(&image_data)
    } else {
        &image_data
    };

    let image_bytes = BASE64
        .decode(image_data_str)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Load image
    let img = image::load_from_memory(&image_bytes)
        .map_err(|e| format!("Failed to load image: {}", e))?;

    let (width, height) = img.dimensions();
    info!("Image size: {}x{}", width, height);

    let mut rgba_img = img.to_rgba8();
    let tolerance_sq = (tolerance as f64).powi(2) * 3.0; // Squared tolerance for RGB

    // Create a mask to track which pixels to make transparent
    let mut mask: Vec<Vec<bool>> = vec![vec![false; width as usize]; height as usize];

    // Get background color samples from all edges
    let mut bg_colors: Vec<(u8, u8, u8)> = Vec::new();

    // Sample top and bottom edges
    for x in 0..width {
        let top_pixel = rgba_img.get_pixel(x, 0);
        let bottom_pixel = rgba_img.get_pixel(x, height - 1);
        bg_colors.push((top_pixel[0], top_pixel[1], top_pixel[2]));
        bg_colors.push((bottom_pixel[0], bottom_pixel[1], bottom_pixel[2]));
    }

    // Sample left and right edges
    for y in 0..height {
        let left_pixel = rgba_img.get_pixel(0, y);
        let right_pixel = rgba_img.get_pixel(width - 1, y);
        bg_colors.push((left_pixel[0], left_pixel[1], left_pixel[2]));
        bg_colors.push((right_pixel[0], right_pixel[1], right_pixel[2]));
    }

    // Calculate average background color
    let total = bg_colors.len() as f64;
    let avg_r: f64 = bg_colors.iter().map(|c| c.0 as f64).sum::<f64>() / total;
    let avg_g: f64 = bg_colors.iter().map(|c| c.1 as f64).sum::<f64>() / total;
    let avg_b: f64 = bg_colors.iter().map(|c| c.2 as f64).sum::<f64>() / total;

    info!(
        "Average background color: R={:.0}, G={:.0}, B={:.0}",
        avg_r, avg_g, avg_b
    );

    // Helper function to check if a pixel is similar to background
    let is_background = |pixel: &Rgba<u8>| -> bool {
        let dr = pixel[0] as f64 - avg_r;
        let dg = pixel[1] as f64 - avg_g;
        let db = pixel[2] as f64 - avg_b;
        let dist_sq = dr * dr + dg * dg + db * db;
        dist_sq < tolerance_sq
    };

    // Flood fill from all edge pixels using BFS
    let mut queue: VecDeque<(u32, u32)> = VecDeque::new();

    // Add all edge pixels that match background color
    for x in 0..width {
        if is_background(rgba_img.get_pixel(x, 0)) {
            queue.push_back((x, 0));
            mask[0][x as usize] = true;
        }
        if is_background(rgba_img.get_pixel(x, height - 1)) {
            queue.push_back((x, height - 1));
            mask[(height - 1) as usize][x as usize] = true;
        }
    }

    for y in 0..height {
        if is_background(rgba_img.get_pixel(0, y)) && !mask[y as usize][0] {
            queue.push_back((0, y));
            mask[y as usize][0] = true;
        }
        if is_background(rgba_img.get_pixel(width - 1, y))
            && !mask[y as usize][(width - 1) as usize]
        {
            queue.push_back((width - 1, y));
            mask[y as usize][(width - 1) as usize] = true;
        }
    }

    // BFS flood fill
    let directions: [(i32, i32); 8] = [
        (-1, -1),
        (-1, 0),
        (-1, 1),
        (0, -1),
        (0, 1),
        (1, -1),
        (1, 0),
        (1, 1),
    ];

    while let Some((x, y)) = queue.pop_front() {
        for (dx, dy) in directions.iter() {
            let nx = x as i32 + dx;
            let ny = y as i32 + dy;

            if nx >= 0 && nx < width as i32 && ny >= 0 && ny < height as i32 {
                let nx = nx as u32;
                let ny = ny as u32;

                if !mask[ny as usize][nx as usize] {
                    let pixel = rgba_img.get_pixel(nx, ny);
                    if is_background(pixel) {
                        mask[ny as usize][nx as usize] = true;
                        queue.push_back((nx, ny));
                    }
                }
            }
        }
    }

    // Apply mask with edge feathering
    let feather_radius = 2;
    for y in 0..height {
        for x in 0..width {
            if mask[y as usize][x as usize] {
                let mut min_dist = feather_radius as f64 + 1.0;

                for fy in (y.saturating_sub(feather_radius))..=(y + feather_radius).min(height - 1) {
                    for fx in (x.saturating_sub(feather_radius))..=(x + feather_radius).min(width - 1) {
                        if !mask[fy as usize][fx as usize] {
                            let dist = (((x as i32 - fx as i32).pow(2)
                                + (y as i32 - fy as i32).pow(2))
                                as f64)
                                .sqrt();
                            min_dist = min_dist.min(dist);
                        }
                    }
                }

                let pixel = rgba_img.get_pixel_mut(x, y);
                if min_dist <= feather_radius as f64 {
                    let alpha = ((min_dist / feather_radius as f64) * 255.0) as u8;
                    pixel[3] = alpha.min(pixel[3]);
                } else {
                    pixel[3] = 0;
                }
            }
        }
    }

    // Encode result as PNG base64
    let mut output_bytes = Vec::new();
    let mut cursor = Cursor::new(&mut output_bytes);
    rgba_img
        .write_to(&mut cursor, ImageFormat::Png)
        .map_err(|e| format!("Failed to encode result: {}", e))?;

    let result_base64 = format!("data:image/png;base64,{}", BASE64.encode(&output_bytes));

    info!("remove_background: Success");
    Ok(result_base64)
}
