mod tables;
use spacetimedb::{ReducerContext, Table};
use tables::{pixels, to_rgb, Pixel, PIXEL_HEIGHT, PIXEL_VERSION_COUNT, PIXEL_WIDTH};

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {

    if ctx.db.pixels().count() == 0 {

        for y in 0..PIXEL_HEIGHT {
            for x in 0..PIXEL_WIDTH {
                ctx.db.pixels().insert(Pixel { 
                    pixel_id: PIXEL_WIDTH*y + x, 
                    version_id: 0, 
                    pixel_x: x, 
                    pixel_y: y, 
                    color: to_rgb(0)
                });
            }
        }
    }
    else
    {
        //If our pixels d exist then we need to find the previous max version id and 
        let mut max_version_id = PIXEL_VERSION_COUNT.load(std::sync::atomic::Ordering::Relaxed);
        for pixel in ctx.db.pixels().iter() {
            max_version_id = max_version_id.max(pixel.version_id);
        }
        max_version_id += 1;
        PIXEL_VERSION_COUNT.store(max_version_id, std::sync::atomic::Ordering::Relaxed);
    }
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(_ctx: &ReducerContext) {
    // Called everytime a new client connects
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(_ctx: &ReducerContext) {
    // Called everytime a client disconnects
}