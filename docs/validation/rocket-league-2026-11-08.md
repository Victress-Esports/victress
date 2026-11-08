# Rocket League scoreboard validation, 2026-11-08

Files attempted: **50**. Fully matching: **39**. Pass rate: **78.0%**.

Parser: boxcars 0.13 (MIT) through tools/rlparse. Truth: the scoreboard stored in each replay header. Compared: score, goals, assists, saves and shots per player, and both team scores, rebuilt from the network frames. A file passes only if everything matches exactly.

Distinct game builds in the sample: 5. Seed: 1. Source: public ballchasing replays.

## Failure causes
- player_count: 8 files
- team_unresolved: 5 files
- no_header_players: 3 files
- player_not_found: 3 files

## Files
| id | result | build | type | causes |
|---|---|---|---|---|
| cc9540da-fa8d-472b-9b91-c888ad216e86 | FAIL | 260811.1257.524913 | Online | team_unresolved |
| 75dbd235-55a4-4b2a-b621-87d2e68c810f | pass | 251202.62834.504897 | Online |  |
| 35c47096-71f1-44ef-81e8-27531cfce8fd | pass | 260602.75104.519749 | Online |  |
| 0a31b8c2-c66c-4efe-ba6c-2993ba908aa7 | pass | 260602.75104.519749 | Online |  |
| b2e34fdd-1f29-4492-a5e9-d0c28c2981e1 | pass | 260602.75104.519749 | Online |  |
| 74718b9f-1811-4390-8db0-a70dd4dd981d | pass | 260811.1257.524913 | Online |  |
| 686a5e8b-4686-45ed-8385-d0c1f1aed56e | FAIL | 251202.62834.504897 | Online | no_header_players, player_count |
| 3a95edb2-3e0b-459b-95f0-8fcad12ac4ae | FAIL | 251202.62834.504897 | Online | team_unresolved |
| 7c29b896-18c2-47c6-b54e-40768e98b089 | pass | 260602.75104.519749 | Online |  |
| bcf0b34c-290a-4543-bd74-6fb9c4f35926 | pass | 251202.62834.504897 | Online |  |
| 8d640c72-bca0-4b9f-90be-433777d772be | FAIL | 260316.80791.512269 | Online | player_count, team_unresolved |
| 04633ede-a84e-4ff2-b9a9-83ed64d42f21 | FAIL | 260811.1257.524913 | Online | player_count, team_unresolved |
| 356cb3cb-3c5c-4b1a-9dfc-1f00e9df6a34 | pass | 251202.62834.504897 | Online |  |
| 27b7b947-4338-4462-a6b1-78c652762125 | pass | 260316.80791.512269 | Online |  |
| c87ea230-ccf2-4967-a52d-da51930632c9 | pass | 260316.80791.512269 | Online |  |
| 86649acd-4703-43d3-a8bc-ae602f1cddfe | FAIL | 251202.62834.504897 | Online | no_header_players, player_count |
| 2b4b412f-9b48-4373-bb26-b60284c8a3df | pass | 260602.75104.519749 | Online |  |
| 4b430d56-7bfe-41a4-8c82-51e575c4a3ab | pass | 261031.63733.533021 | Online |  |
| 98a92df3-f394-4094-bd6d-2631bb5ed5ff | pass | 251202.62834.504897 | Online |  |
| ba9ab82e-0eaf-449a-835c-36e0572a899b | pass | 260602.75104.519749 | Online |  |
| 4012bb4e-14c7-4e16-8c2b-c7ea4169be31 | pass | 260602.75104.519749 | Online |  |
| a487c5ad-47d6-41fc-a639-6304ce5ad034 | pass | 261031.63733.533021 | Online |  |
| aeda3fa5-791a-424a-a22a-97d4818bf71b | pass | 260316.80791.512269 | Online |  |
| d444198b-bc88-4418-8d95-ece8093af456 | pass | 260602.75104.519749 | Online |  |
| 25627ef4-1e55-460d-852f-407422e4e200 | FAIL | 260811.1257.524913 | Online | player_count, player_not_found |
| 81b6fb36-1c94-4ff3-906d-24db691c7e3f | pass | 261031.63733.533021 | Online |  |
| e2484468-db3c-432e-b464-3084d71edb4a | pass | 260316.80791.512269 | Online |  |
| 050078d2-f381-45b7-966d-d7b26060b360 | pass | 260811.1257.524913 | Online |  |
| 9f65bddf-63b6-425d-b73b-5c736c34be05 | pass | 260316.80791.512269 | Online |  |
| feb151e7-b005-4eab-a050-e8c4d53ba21f | FAIL | 261031.63733.533021 | Online | player_count, player_not_found |
| c87084ed-d5de-4683-a67d-80af579f203e | pass | 260602.75104.519749 | Online |  |
| e7dcb054-8a71-47ce-a30e-5008d067ebf2 | pass | 260811.1257.524913 | Online |  |
| 4ec2dddd-0ee6-476d-8e36-da0004ba9ad7 | pass | 251202.62834.504897 | Online |  |
| b783cb56-ad6a-4867-8057-3229f6e13883 | pass | 261031.63733.533021 | Online |  |
| e1450a92-ae45-4c56-80b0-bce23f60e1d5 | pass | 260811.1257.524913 | Online |  |
| 2c28726f-42f9-486d-9e64-ed9061d48326 | pass | 251202.62834.504897 | Online |  |
| b3181a10-7ebe-4181-b5d8-2da949255747 | pass | 260316.80791.512269 | Online |  |
| fd2c98c6-0e73-41aa-897c-28b4c438742a | FAIL | 260316.80791.512269 | Online | player_count, player_not_found |
| f97b3e0f-b66e-44a9-971b-8f97c729130a | pass | 260811.1257.524913 | Online |  |
| 46cf37eb-2562-415c-af7e-f36d91faecb2 | pass | 251202.62834.504897 | Online |  |
| 330e6da5-e067-437b-99e2-37115e00936b | pass | 260602.75104.519749 | Online |  |
| 0a64f7ae-80d6-4b6d-8aa5-c95f0581aa19 | pass | 251202.62834.504897 | Online |  |
| 22389896-119c-4a90-bbbb-c637c040f115 | pass | 260602.75104.519749 | Online |  |
| 98de671a-2c12-4dcd-9882-7b9e50f288bc | FAIL | 260316.80791.512269 | Online | no_header_players, player_count |
| 828aea17-6312-418c-af2c-d9a7923b63ee | pass | 261031.63733.533021 | Online |  |
| ae805aee-1af5-4a35-a7ef-e125e8b9b54f | pass | 251202.62834.504897 | Online |  |
| c110e3ba-dc64-40d5-a3a5-703149a937b3 | pass | 260602.75104.519749 | Online |  |
| b6b8db1d-83b7-4576-be9a-caf9ae22096b | FAIL | 261031.63733.533021 | Online | team_unresolved |
| 05719f2b-d6ce-40bc-a877-ea6b60523c1d | pass | 260602.75104.519749 | Online |  |
| f616c254-e414-4768-8e68-d4f5165d4c4a | pass | 260811.1257.524913 | Online |  |
