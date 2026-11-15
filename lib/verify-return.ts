// Where a game account verification (Epic or Steam) returns the player: the claim page when they started there, otherwise the Rocket
// League page. Only these two fixed destinations exist; nothing from the URL is used as a path.
export const VERIFY_NEXT_COOKIE = "v_verify_next";
export const verifyDestination = (cookie: string | undefined) => (cookie === "claim" ? "/claim" : "/dashboard/scrims/rocket-league");
