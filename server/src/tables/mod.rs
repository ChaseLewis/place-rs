use std::time::Duration;

use spacetimedb::{client_visibility_filter, Filter, Identity, ReducerContext, Table, Timestamp};

#[spacetimedb::table(name = config)]
pub struct Config {
    #[primary_key]
    pub config_id: u32,
    pub cooldown_seconds: u64
}

#[spacetimedb::table(name = players, public)]
#[spacetimedb::table(name = disconnected_players)]
pub struct Player {
    #[primary_key]
    pub identity: Identity,
    pub next_action: Timestamp
}

#[client_visibility_filter]
const ACCOUNT_FILTER: Filter = Filter::Sql(
    "SELECT * FROM players WHERE identity = :sender"
);

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
    return rgba | 0xFF;
}

#[spacetimedb::reducer]
pub fn update_pixel_coord(ctx: &ReducerContext, pixel_id: u32, fill_color: u32) -> Result<(),String> {
    if pixel_id >= PIXEL_HEIGHT*PIXEL_WIDTH {
        return Err("pixel_id is out of range".to_string());
    }

    if let Some(player) = ctx.db.players().identity().find(ctx.sender) {

        if player.next_action > ctx.timestamp {
            return Err("Player action on cooldown".to_string());
        }

        if let Some(pixel) = ctx.db.pixels().pixel_id().find(&pixel_id) {

            let rgb = to_rgb(fill_color);
            if pixel.color != rgb {        
                //Change the pixel
                ctx.db.pixels().pixel_id().update(Pixel {
                    color: rgb,
                    ..pixel
                });

                let config = ctx.db.config().config_id().find(0).unwrap();
                if config.cooldown_seconds > 0
                {
                    //Consume the players action
                    let next_timestamp = ctx.timestamp.checked_add_duration(Duration::from_secs(config.cooldown_seconds)).unwrap();
                    ctx.db.players().identity().update(Player {
                        next_action: next_timestamp,
                        ..player
                    });
                }
            }
        }
    } else {
        return Err("Player does not exist".to_string());
    }

    return Ok(());
}

#[spacetimedb::table(name = server_stats, public)]
pub struct ServerStats {
    #[primary_key]
    pub stats_id: u32,
    pub active_players: u64
}

#[spacetimedb::table(name = calculate_server_stats_timer, scheduled(calculate_server_stats))]
pub struct CalculateServerStatsTimer {
    #[primary_key]
    #[auto_inc]
    pub scheduled_id: u64,
    pub scheduled_at: spacetimedb::ScheduleAt
}

#[spacetimedb::reducer]
pub fn calculate_server_stats(ctx: &ReducerContext, _timer: CalculateServerStatsTimer) -> Result<(),String> {
    
    if let Some(stats) = ctx.db.server_stats().stats_id().find(0) {
        ctx.db.server_stats().stats_id().update(ServerStats {
            active_players: ctx.db.players().count(),
            ..stats
        });
    }

    return Ok(());
}