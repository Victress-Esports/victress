// rlparse: prints the in-replay scoreboard (header) and the same numbers rebuilt from the network frames, as JSON.
// Usage: rlparse file.replay      Exit code 0 with JSON on success; exit code 1 with {"error": ...} on failure.
use boxcars::{Attribute, HeaderProp, ParserBuilder};
use serde_json::{json, Value};
use std::collections::HashMap;

fn prop<'a>(props: &'a [(String, HeaderProp)], k: &str) -> Option<&'a HeaderProp> { props.iter().find(|(n, _)| n == k).map(|(_, v)| v) }
fn int(p: Option<&HeaderProp>) -> Option<i64> { match p { Some(HeaderProp::Int(i)) => Some(*i as i64), Some(HeaderProp::QWord(q)) => Some(*q as i64), _ => None } }
fn text(p: Option<&HeaderProp>) -> Option<String> { match p { Some(HeaderProp::Str(s)) | Some(HeaderProp::Name(s)) => Some(s.clone()), _ => None } }

#[derive(Default, Clone)]
struct Pri { name: Option<String>, team_actor: Option<i32>, score: Option<i32>, goals: Option<i32>, assists: Option<i32>, saves: Option<i32>, shots: Option<i32> }

fn run(path: &str) -> Result<Value, String> {
    let data = std::fs::read(path).map_err(|e| e.to_string())?;
    let replay = ParserBuilder::new(&data).must_parse_network_data().on_error_check_crc().parse().map_err(|e| e.to_string())?;
    let props = &replay.properties;

    // header scoreboard
    let mut header_players = vec![];
    if let Some(HeaderProp::Array(rows)) = prop(props, "PlayerStats") {
        for r in rows {
            header_players.push(json!({
                "name": text(prop(r, "Name")), "team": int(prop(r, "Team")), "score": int(prop(r, "Score")), "goals": int(prop(r, "Goals")),
                "assists": int(prop(r, "Assists")), "saves": int(prop(r, "Saves")), "shots": int(prop(r, "Shots")),
            }));
        }
    }
    let mut header_goals = 0usize;
    if let Some(HeaderProp::Array(rows)) = prop(props, "Goals") { header_goals = rows.len(); }
    let header = json!({
        "team0_score": int(prop(props, "Team0Score")), "team1_score": int(prop(props, "Team1Score")), "goal_events": header_goals,
        "players": header_players, "build_version": text(prop(props, "BuildVersion")), "match_type": text(prop(props, "MatchType")),
        "team_size": int(prop(props, "TeamSize")), "date": text(prop(props, "Date")), "num_frames": int(prop(props, "NumFrames")),
        "major": replay.major_version, "minor": replay.minor_version, "net_version": replay.net_version,
    });

    // network scoreboard
    let frames = &replay.network_frames.as_ref().ok_or("no network frames")?.frames;
    let name_of = |id: i32| replay.objects.get(id as usize).map(|s| s.as_str()).unwrap_or("");
    let mut class_of: HashMap<i32, String> = HashMap::new();
    let mut live: HashMap<i32, Pri> = HashMap::new();
    let mut done: Vec<Pri> = vec![];
    let mut team_index: HashMap<i32, usize> = HashMap::new();
    let mut team_score: [Option<i32>; 2] = [None, None];
    let mut team_of_actor_score: HashMap<i32, i32> = HashMap::new();
    for f in frames {
        for a in &f.new_actors {
            let n = name_of(a.object_id.0).to_string();
            if n.contains("Team0") { team_index.insert(a.actor_id.0, 0); }
            if n.contains("Team1") { team_index.insert(a.actor_id.0, 1); }
            if n.contains("PRI_TA") { live.insert(a.actor_id.0, Pri::default()); }
            class_of.insert(a.actor_id.0, n);
        }
        for d in &f.deleted_actors {
            if let Some(p) = live.remove(&d.0) { done.push(p); }
            class_of.remove(&d.0);
        }
        for u in &f.updated_actors {
            let prop_name = name_of(u.object_id.0);
            let id = u.actor_id.0;
            if prop_name == "Engine.TeamInfo:Score" {
                if let Attribute::Int(v) = &u.attribute { team_of_actor_score.insert(id, *v); if let Some(i) = team_index.get(&id) { team_score[*i] = Some(*v); } }
                continue;
            }
            if let Some(p) = live.get_mut(&id) {
                match (prop_name, &u.attribute) {
                    ("Engine.PlayerReplicationInfo:PlayerName", Attribute::String(s)) => p.name = Some(s.clone()),
                    ("Engine.PlayerReplicationInfo:Team", Attribute::ActiveActor(a)) => p.team_actor = if a.active { Some(a.actor.0) } else { p.team_actor },
                    ("TAGame.PRI_TA:MatchScore", Attribute::Int(v)) => p.score = Some(*v),
                    ("TAGame.PRI_TA:MatchGoals", Attribute::Int(v)) => p.goals = Some(*v),
                    ("TAGame.PRI_TA:MatchAssists", Attribute::Int(v)) => p.assists = Some(*v),
                    ("TAGame.PRI_TA:MatchSaves", Attribute::Int(v)) => p.saves = Some(*v),
                    ("TAGame.PRI_TA:MatchShots", Attribute::Int(v)) => p.shots = Some(*v),
                    _ => {}
                }
            }
        }
    }
    done.extend(live.into_values());
    let net_players: Vec<Value> = done.iter().filter(|p| p.name.is_some()).map(|p| json!({
        "name": p.name, "team": p.team_actor.and_then(|t| team_index.get(&t)), "score": p.score, "goals": p.goals, "assists": p.assists, "saves": p.saves, "shots": p.shots,
    })).collect();
    Ok(json!({ "header": header, "network": { "players": net_players, "team0_score": team_score[0], "team1_score": team_score[1], "frames": frames.len() } }))
}

fn main() {
    let path = std::env::args().nth(1).unwrap_or_default();
    match run(&path) {
        Ok(v) => println!("{}", v),
        Err(e) => { println!("{}", json!({ "error": e })); std::process::exit(1); }
    }
}
