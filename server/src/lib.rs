mod tables;
use spacetimedb::{ReducerContext, Table};
use tables::{disconnected_players, pixels, players, to_rgb, Pixel, Player, PIXEL_HEIGHT, PIXEL_WIDTH};

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {

    let count = ctx.db.pixels().count() as u32;
    let image_size = PIXEL_WIDTH*PIXEL_HEIGHT;
    for idx in count..image_size {
        ctx.db.pixels().insert(Pixel { 
            pixel_id: idx,
            color: to_rgb(0)
        });
    }
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) {

    if let Some(player) = ctx.db.disconnected_players().identity().find(ctx.sender) {
        ctx.db.players().insert(player);
        ctx.db.disconnected_players().identity().delete(ctx.sender);
    }
    else {
        ctx.db.players().insert(Player {
            identity: ctx.sender,
            energy: 0
        });
    }
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    if let Some(player) = ctx.db.players().identity().find(ctx.sender) {
        ctx.db.disconnected_players().insert(player);
        ctx.db.players().identity().delete(ctx.sender);
    }
}