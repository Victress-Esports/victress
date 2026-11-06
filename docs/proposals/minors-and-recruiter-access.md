# Minors and recruiter access (position and legal questions)

**Status: a restriction and a list of questions for counsel. No age verification is designed or implemented here, and no exception is proposed.**
Basis: [strategy document](../strategy/victress-business-purpose.md) section 3B (trustworthy recruitment; no contact disclosure without consent). Related: [privacy architecture](privacy-safety-architecture.md), [organization verification](organization-verification.md).
Not legal advice.

## 1. The restriction (maintained)
**Recruiter discovery of, and recruiter contact with, players who are minors is not permitted until qualified legal review establishes the requirements.**

Practical consequence, stated plainly: Victress does not currently collect or verify any age information (the 13+ line on sign in is a notice only), so it cannot tell which players are minors. The only way to honor the restriction without inventing an age mechanism is that **no recruiter discovery or contact feature goes live for any player** until counsel has defined:
- who counts as a minor for this purpose, and in which jurisdictions,
- what evidence of age, if any, the product may and must collect, and how it is stored,
- what the rules are for recruiters (including collegiate programs) and for platform consent.

Until then the Scout Desk discovery, `scoutable` visibility and contact requests stay unbuilt and unavailable. Nothing in this document designs the age mechanism; counsel's answers define it.

## 2. What this document does not do
- It does not propose an age gate, a date of birth field, identity verification, or parental consent flow.
- It does not create exceptions (for example "16 and over with a school email" or "collegiate programs only").
- It does not claim COPPA or any other legal compliance.

## 3. What is unaffected
- A player's own private profile and the player's own deliberate sharing of a link (see the question in section 4).
- Team rosters and invite links among teammates.
- The existing 13+ notice, which remains a notice until the age questions are resolved.

## 4. Questions for qualified counsel
1. Which age thresholds and jurisdictions apply to a platform that lets organizations discover and contact players: under 13, under 16, under 18, and any state, national or regional rules (for example children's privacy laws, teen privacy and consent laws, digital consent ages)?
2. What are Victress's obligations once it has actual knowledge a user is a minor (for example from a bio)?
3. Is a player-initiated sharing link, used by a minor to show a Resume to a recruiter or school, acceptable, restricted or in need of safeguards? Should link creation be limited for players whose age is unknown?
4. What age information may Victress collect, in what form (a confirmation, an age band, a date of birth), and what retention and security rules apply?
5. What is permitted for collegiate recruiting specifically, including institutional rules on recruiting and communication with prospective student athletes and high school players?
6. What parental consent or notice requirements apply to profiles, contact and data processing for minors?
7. What must recruiter terms say (no unsolicited contact, no off platform solicitation, mandatory reporting, data handling), and how are they enforced?
8. What obligations apply to reporting, evidence retention and cooperation with authorities when minors are involved (see [safety operations](safety-operations.md))?
9. What privacy policy and terms changes are required before launch?
10. Does the strategy's goal of helping high school and collegiate players change any of the above in a way the product must support?

## 5. Dependencies
This document gates: recruiter discovery, the `scoutable` flag, contact requests, Scout Desk, and any marketing that implies recruiter access for young players. It does not gate the privacy foundation or link sharing.

## 6. Decision needed
Engage qualified counsel and share this question list; report the answers so the age design can be proposed accurately.
