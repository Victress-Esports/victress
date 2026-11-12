// Unit checks for lib/age.ts (whole years from a birth date). Run: node --experimental-strip-types scripts/age-test.mjs
import { ageOn } from "../lib/age.ts";
let failed = 0;
const check = (ok, name) => { console.log(`${ok ? "PASS" : "FAIL"} ${name}`); if (!ok) failed++; };
const today = new Date(Date.UTC(2026, 10, 10)); // 2026-11-10
check(ageOn("2013-11-10", today) === 13, "13th birthday today is 13");
check(ageOn("2013-11-11", today) === 12, "13th birthday tomorrow is still 12");
check(ageOn("2013-11-09", today) === 13, "13th birthday yesterday is 13");
check(ageOn("2012-02-29", new Date(Date.UTC(2026, 1, 28))) === 13, "leap day birthday: 13 on Feb 28 (not yet 14)");
check(ageOn("2026-11-10", today) === 0, "born today is 0");
check(ageOn("2026-11-11", today) === null, "a future date is not a valid birth date");
check(ageOn("2013-02-30", today) === null, "an impossible date is refused");
check(ageOn("1899-12-31", today) === null, "before 1900 is refused");
check(ageOn("garbage", today) === null, "text is refused");
console.log(failed ? `\n${failed} AGE CHECK(S) FAILED` : "\nALL AGE CHECKS PASSED");
process.exit(failed ? 1 : 0);
