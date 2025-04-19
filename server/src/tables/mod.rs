use std::{sync::atomic::AtomicU64, u64};
use spacetimedb::ReducerContext;

#[spacetimedb::table(name = pixels, public, index(name = pixel_coords,btree(columns = [pixel_x,pixel_y])))]
pub struct Pixel {
    #[primary_key]
    pub pixel_id: u32,
    pub pixel_x: u32,
    pub pixel_y: u32,
    pub color: u32,
    pub version_id: u64
}

pub const PIXEL_WIDTH: u32 = 1000;
pub const PIXEL_HEIGHT: u32 = 1000;
pub static PIXEL_VERSION_COUNT: AtomicU64 = AtomicU64::new(1);

#[inline]
pub fn to_rgb(rgba: u32) -> u32 {
    return rgba | 0x000000FF;
}

#[spacetimedb::reducer]
pub fn update_pixel_coord(ctx: &ReducerContext, pixel_id: u32, fill_color: u32) -> Result<(),String> {
    if pixel_id >= PIXEL_HEIGHT*PIXEL_WIDTH {
        return Err("pixel_id is out of range".to_string());
    }

    if let Some(pixel) = ctx.db.pixels().pixel_id().find(&pixel_id) {

        let rgb = to_rgb(fill_color);
        ctx.db.pixels().pixel_id().update(Pixel {
            version_id: PIXEL_VERSION_COUNT.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
            color: rgb,
            ..pixel
        });
    }

    return Ok(());
}

