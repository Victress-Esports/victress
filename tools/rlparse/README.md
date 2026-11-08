# rlparse

Prints a Rocket League replay's own scoreboard (header `PlayerStats`, team scores) and the same numbers rebuilt from the network frames, as one JSON object. Built on the MIT licensed [boxcars](https://crates.io/crates/boxcars) crate (0.13). Used by `scripts/rl-validate.mjs`.

    cargo build --release --manifest-path tools/rlparse/Cargo.toml
    tools/rlparse/target/release/rlparse some.replay

Exit 0 with JSON, or exit 1 with `{"error": "..."}`. Missing network values mean the game never updated them (zero). Replay files are never committed.
