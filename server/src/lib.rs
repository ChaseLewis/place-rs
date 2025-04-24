mod tables;
use std::time::Duration;
use spacetimedb::{ReducerContext, Table};
use tables::{config, disconnected_players, pixels, players, to_rgb, Config, Pixel, Player, PIXEL_HEIGHT, PIXEL_WIDTH};

#[spacetimedb::reducer(init)]
pub fn init(ctx: &ReducerContext) {

    let count = ctx.db.pixels().count() as u32;
    let image_size = PIXEL_WIDTH*PIXEL_HEIGHT;
    for idx in count..image_size {
        ctx.db.pixels().insert(Pixel { 
            pixel_id: idx,
            color: to_rgb(0xFFFFFFFF)
        });
    }

    if ctx.db.config().count() == 0 {
        ctx.db.config().insert(Config {
            config_id: 0,
            cooldown_seconds: 1
        });
    }
}

#[spacetimedb::reducer(client_connected)]
pub fn identity_connected(ctx: &ReducerContext) -> Result<(),String> {

    if let Some(player) = ctx.db.disconnected_players().identity().find(ctx.sender) {
        ctx.db.players().insert(player);
        ctx.db.disconnected_players().identity().delete(ctx.sender);
        return Ok(());
    }

    let config = ctx.db.config().config_id().find(0).unwrap();
    let _ = ctx.db.players().try_insert(Player { 
        identity: ctx.sender, 
        next_action: ctx.timestamp.checked_add(Duration::from_secs(config.cooldown_seconds).into()).unwrap() 
    });


    return Ok(()); 
}

#[spacetimedb::reducer(client_disconnected)]
pub fn identity_disconnected(ctx: &ReducerContext) {
    if let Some(player) = ctx.db.players().identity().find(ctx.sender) {
        ctx.db.disconnected_players().insert(player);
        ctx.db.players().identity().delete(ctx.sender);
    }
}