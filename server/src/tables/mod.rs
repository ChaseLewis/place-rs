use spacetimedb::{Identity, ReducerContext};

#[spacetimedb::table(name = players, public)]
#[spacetimedb::table(name = disconnected_players)]
pub struct Player {
    #[primary_key]
    pub identity: Identity,
    pub energy: u32
}

//We should have a 

#[spacetimedb::table(name = pixels, public)]
pub struct Pixel {
    #[primary_key]
    pub pixel_id: u32,
    pub color: u32
}

pub const PIXEL_WIDTH: u32 = 1000;
pub const PIXEL_HEIGHT: u32 = 1000;

#[inline]
pub fn to_rgb(rgba: u32) -> u32 {
    return rgba | 0x000000FF;
}

#[spacetimedb::reducer]
pub fn update_pixel_coord(ctx: &ReducerContext, pixel_id: u32, fill_color: u32) -> Result<(),String> {

    if pixel_id > PIXEL_HEIGHT*PIXEL_WIDTH {
        return Err("pixel_id is out of range".to_string());
    }

    if let Some(pixel) = ctx.db.pixels().pixel_id().find(&pixel_id) {

        let rgb = to_rgb(fill_color);
        if pixel.color != rgb {        
                ctx.db.pixels().pixel_id().update(Pixel {
                color: rgb,
                ..pixel
            });
        }
    }

    return Ok(());
}

