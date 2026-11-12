// Final plain English legal pages (founder approved 2026-11-07). They describe only what Victress does today, make no
// compliance or security claim that is not true, and avoid hyphens and dashes like the rest of the marketing copy.
// Facts below come from the code and schema: Supabase Auth, database and file storage; Vercel hosting; Resend email; Stripe for
// paid plans; no advertising or third party tracking tags. Prices come from content/pricing.ts and are repeated on the refunds page.
import { CONTACT_EMAIL } from "@/content/copy";

// Privacy and Terms requests go to a dedicated inbox. Billing and general contact keep CONTACT_EMAIL.
const PRIVACY_EMAIL = "privacy@victressesports.com";

export interface LegalSection {
  h: string;
  p?: string[];
  list?: string[];
  /** Paragraphs shown after the list. */
  after?: string[];
}
export interface LegalDoc {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
}

const UPDATED = "Effective November 7, 2026";

export const privacyDoc: LegalDoc = {
  title: "Privacy",
  updated: "Effective November 10, 2026",
  intro:
    "This page explains what Victress collects, why, who sees it and how you control it. Victress is an esports player development and recruitment platform run by Victress LLC. We keep it plain and describe how information is handled across the Victress website, platform and integrations, including Victress Scrim Intelligence, the Discord application run by Victress LLC (called the Discord integration on this page).",
  sections: [
    {
      h: "What we collect",
      list: [
        "Your account: your email address and the sign in method you choose (an email link, Discord or Google). If you use Discord or Google to sign in, we receive the details that service shares for sign in. We do not copy your real name or photo from them into your Victress profile.",
        "Your profile: the name you pick, and anything you add such as a display name, bio, profile photo, your games and roles, and links to highlights you host elsewhere.",
        "Your team: a team name and information about who is on the roster, if you start or join a team. Invite links are codes that let someone join your team.",
        "Discord integration: if you connect a Discord account or install or use a Victress Discord integration, we may process your Discord user ID, server (guild) ID, relevant account identifiers, and information needed to associate your Discord account with your Victress account or team. When you use bot commands or interactions, Discord provides information needed to respond, such as the command, the user who invoked it, and the server and channel where it was used.",
        "Discord server configuration: if a team administrator configures Victress in a Discord server, we may process the server and channel settings needed to provide the integration, such as the selected server and channels used for team or scrim workflows.",
        "Scrim and match information: if you or an authorized team representative submits a scrim, replay, match reference or related information through Victress or its Discord integration, we may process the submission, match identifiers, participating teams and players, game information, replay files or links, and resulting performance data.",
        "Game imports: if you are approved and connect a Riot ID, we store that Riot ID and the League of Legends matches we fetch for it from Riot's API (results, your numbers, and the other players in each match as anonymous entries with no names). They are private to you. You can delete a match or all of it at any time.",
        "Practice files: if you are approved as a design partner and upload a demo or replay file, it is stored privately with the file name and size.",
        "Game stats from earlier versions: earlier versions of Victress let players enter game stats. We still hold what was entered. We do not show it to anyone.",
        "Messages you send us: the contact and design partner forms send your details to our email inbox. They are not stored in the Victress database.",
        "Waitlist: your email address and the plan you are interested in.",
        "Basic technical data: our hosting provider records requests to the site (such as your IP address, the page and the time) so the site works and stays secure.",
      ],
      after: [
        "We do not intentionally collect the contents of general Discord conversations. The Discord integration is designed to respond to its commands and interactions and to process information needed for the features you use. We do not use it to scrape server conversations or collect unrelated messages.",
      ],
    },
    {
      h: "Why we use it",
      p: ["We do not use your information for advertising, and we do not run advertising or third party tracking tags on the site."],
      list: [
        "To run your account and show you your own profile, resume and team.",
        "To let you decide what others can see, and to show only that.",
        "To connect Discord accounts and teams when you choose to use those features.",
        "To respond to Discord commands and provide team, scrim and match workflows.",
        "To process submitted match information and generate performance insights.",
        "To send you emails you need, such as sign in links, a welcome message and a confirmation that we received a form.",
        "To keep Victress working, safe and fair, including handling reports of abuse.",
        "To process payments for paid plans, when you choose one.",
      ],
    },
    {
      h: "Who we share it with",
      p: [
        "We do not sell your data. We share information only with service providers who help us run Victress, and only as needed:",
      ],
      list: [
        "Supabase: sign in, the database and private file storage.",
        "Vercel: hosting and delivery of the site and application.",
        "Resend: sending email.",
        "Stripe: payments for paid plans. Stripe handles your card details. We do not see or store your card number.",
        "Discord: if you choose Discord sign in or use a Victress Discord integration, information is exchanged with Discord to authenticate users, receive bot interactions and provide the integration. Discord processes information under its own terms and privacy policy.",
        "Google: only if you choose Google sign in.",
      ],
      after: [
        "Information may also be disclosed when required by law or when reasonably necessary to protect Victress, its users or others.",
      ],
    },
    {
      h: "Public and private profiles",
      p: [
        "Your profile is private by default. Nobody else can see it unless you choose to share it, and the choices are yours: which fields others can see, whether your profile is listed publicly, and whether search engines may list it.",
        "Private links let you share a view of your profile with a person you choose. You pick what the link shows and when it expires, and you can turn it off at any time.",
        "If you upload a profile photo, it is stored in a place where anyone who has the exact address of the photo can open it. Choose a photo you are comfortable with.",
        "We do not show contact details or private identity to anyone without your consent. Victress does not let people message you.",
        "Connecting a Discord account, joining a team, or submitting a scrim does not automatically make your Victress profile public. Your profile visibility and sharing choices remain separate.",
      ],
    },
    {
      h: "Discord, teams and player consent",
      p: [
        "A team administrator or Discord server administrator may install Victress Scrim Intelligence in a server and configure the channels and team workflows it needs. Installing the integration gives it only the Discord permissions approved during installation and any additional permissions separately authorized later.",
        "A server administrator's decision to install the integration does not, by itself, give consent on behalf of every player to connect their individual Discord account to Victress, publish their profile, or make private profile information visible.",
        "Players must use the applicable Victress account linking and consent process to associate their own Discord identity with their Victress account. Team participation and scrim submission do not automatically change a player's profile visibility settings.",
        "Team level processing and individual consent are separate. When a team or team representative submits a scrim, replay, match or roster, that is not consent from any player to publish their Victress profile, statistics or personal information. What others can see about a player on Victress comes only from that player's own privacy choices.",
        "Information submitted for a team is used to provide that team's workflows and may be visible to the people on that team who are authorized to use those features. Anything the integration posts in a Discord channel, such as a reply or embed, can be seen by the people who can view that channel, and Discord's rules apply to it.",
        "Team representatives who submit match or roster information must have the authority to submit that information and must not submit information they have no right to share.",
        "If a team removes the integration from its Discord server, Victress will no longer receive new interactions from that installation. Removing the integration does not necessarily delete information already submitted to or stored by Victress. Account and data deletion requests are handled under the section below.",
      ],
    },
    {
      h: "Your choices and your data",
      p: [
        "You can change your profile, privacy choices and links in your dashboard at any time.",
        "You can disconnect an authorized Discord connection or stop using the Discord integration. A team administrator can remove the integration from their server. Disconnecting an integration does not necessarily delete information already stored in Victress.",
        `To see your data, correct it, or delete your account, use the account controls when available or email ${PRIVACY_EMAIL} from the address on your account. We delete your account, profile, team membership and uploaded files, subject to any limited retention required by law or reasonably necessary to prevent abuse. We confirm account deletion by email. We act on requests as quickly as we can and no later than 30 days.`,
        "If you ask us to delete Discord linked information, we will remove or disassociate the relevant information from your Victress account where applicable, subject to legitimate retention requirements. Information retained as part of a team's records or match history may need to be handled separately from your personal account and profile.",
        "If you are a parent or guardian and believe a child under 13 has given us information, email us and we will delete it.",
      ],
    },
    {
      h: "How long we keep it",
      list: [
        "Account and profile information: until you delete your account.",
        "Discord account associations: until you disconnect the integration, delete your account, or the association is otherwise no longer needed, subject to limited security and legal records.",
        "Discord server configuration: while the server integration is active and the configuration is needed to provide it. We may retain limited records for security, troubleshooting or legal reasons.",
        "Scrim and match information: for as long as it is needed to provide team and player features, maintain match history and performance records, or meet legal and security requirements. Deletion of a personal account does not necessarily mean that every team match record is deleted.",
        "Uploaded practice files: until you delete them or your account, subject to any applicable retention requirements.",
        "Waitlist emails: until you ask us to remove them or we have contacted you about the plan.",
        "Messages sent through our forms: in our email inbox for as long as we need them to reply and keep records.",
        "Technical logs: kept by our providers for a short time under their own settings.",
      ],
    },
    {
      h: "Security",
      p: [
        "Connections to Victress use HTTPS. Access to the database is restricted so that people can read only their own private data and the parts of a profile its owner chose to share. Private files are private by default. We limit access to information used by our integrations to what is needed to provide their features. No system is perfectly secure, and we cannot promise that it is.",
      ],
    },
    {
      h: "Age",
      p: [
        "You must be at least 13 to use Victress. If you are under 18, you need a parent or guardian's permission to use Victress. We do not knowingly collect information from anyone under 13 and we delete it if we learn we have.",
      ],
    },
    {
      h: "Changes and contact",
      p: [
        "If we change this page in a way that matters, we will update the date at the top and tell account holders by email.",
        `Questions or requests: ${PRIVACY_EMAIL}.`,
      ],
    },
  ],
};

export const termsDoc: LegalDoc = {
  title: "Terms",
  updated: "Effective November 10, 2026",
  intro:
    "These terms are the rules for using Victress, an esports player development and recruitment platform run by Victress LLC. They apply to the Victress website, platform, services and integrations, including Victress Scrim Intelligence, the Discord application run by Victress LLC (called the Discord integration in these terms). By creating an account or using Victress, you agree to them.",
  sections: [
    {
      h: "Who can use Victress",
      p: [
        "You must be at least 13 years old. If you are under 18, you need a parent or guardian's permission to use Victress, and they agree to these terms for you. We do not knowingly collect information from anyone under 13 and we will delete it if we learn we have.",
      ],
    },
    {
      h: "Your account",
      p: [
        "Give accurate information and keep your sign in secure. You are responsible for what happens on your account. Tell us if you think someone else is using it.",
        "You are responsible for keeping control of any Discord account you connect to Victress. Do not connect an account that you do not own or have permission to use.",
      ],
    },
    {
      h: "Acceptable use",
      p: ["Use Victress fairly. You agree not to:"],
      list: [
        "harass, threaten, bully, stalk or abuse anyone, or share someone's private information;",
        "post hate, sexual content involving minors, or anything illegal;",
        "pretend to be another person or organization;",
        "post information that is not yours or that you have no right to share, including other people's private details inside files you upload or match submissions you make;",
        "scrape the site, attack it, or try to get around its limits or privacy controls;",
        "use Victress to spam or mislead others;",
        "submit false, altered or invented match, roster, replay or player data, or try to manipulate results, statistics or records;",
        "use the Discord integration to spam, harass, disrupt servers, or access information or channels without authorization;",
        "attempt to bypass Discord permissions, account linking checks, consent requirements or Victress privacy settings.",
      ],
    },
    {
      h: "Harassment and abuse",
      p: [
        "Everyone should be able to compete and be seen safely. We take harassment seriously, including harassment aimed at women competitors. To report a person, a profile or content, email " +
          `${PRIVACY_EMAIL} with the word Report in the subject and tell us what happened. We review reports, we may act without notice, and we do not tell the person reported who made the report.`,
      ],
    },
    {
      h: "Content you submit",
      p: [
        "You own what you submit. You give Victress permission to store it, process it and show it as you choose in the product, for example on your profile and in links you create. You promise you have the right to submit it. You can remove it at any time, subject to the operation of team records and any legal or security requirements described in our Privacy Policy.",
        "If you submit a replay, match, roster or other team information, you confirm that you have the authority to submit it and that doing so does not violate another person's rights or applicable rules.",
      ],
    },
    {
      h: "Discord integration",
      p: [
        "Victress Scrim Intelligence is a Discord application run by Victress LLC. It allows teams to connect their Discord servers with Victress features and works together with your account on the Victress website and platform.",
        "A server owner or administrator with the Discord permissions needed to add applications may install the integration and grant the permissions shown during installation. Server owners and administrators are responsible for the permissions they grant and how they configure the integration. The integration can use those permissions to provide the features described in the product, such as team setup, account linking workflows, scrim submissions and match related commands.",
        "You agree that:",
      ],
      list: [
        "You will install or configure the integration only in servers where you have permission to do so.",
        "You will use the integration only for its intended Victress features and within the permissions granted by Discord.",
        "You will not use the integration to collect, submit or expose information you are not authorized to share.",
        "You will not use another player's Discord identity or Victress account without their permission.",
        "You will not attempt to use the integration to access private channels or information beyond the permissions granted to it.",
      ],
      after: [
        "Installing the integration in a server does not automatically link every member's Discord account to Victress, grant permission to publish player profiles, or override an individual's privacy choices.",
        "A team submission is not consent from any player to publish their profile, statistics or personal information. Individual consent and profile visibility stay with each player, as described in our Privacy Policy.",
        "Players are responsible for completing any required account linking and consent steps for their own accounts. Team administrators are responsible for ensuring that their use of team and scrim features is authorized.",
        "Discord is a third party service. Your use of Discord is also subject to Discord's own terms, policies and rules. Victress does not control Discord and is not responsible for Discord's services, availability or decisions.",
        "You can stop using the integration by disconnecting your account where available or by having a server administrator remove the integration. Removing the integration or unlinking an account does not automatically delete information previously submitted to Victress. Deletion requests are handled as described in our Privacy Policy.",
        "Victress Scrim Intelligence and its features may change, be limited, be unavailable or be discontinued, including because of Discord outages or changes to Discord's rules. We do not promise that it will always be available or error free.",
      ],
    },
    {
      h: "Our right to remove content or accounts",
      p: [
        "We may remove content, limit features or close an account that breaks these terms, puts others at risk, or that the law requires us to act on. Where we can, we will tell you why.",
        "We may suspend or disable a Discord integration, server configuration or related feature if it is used in violation of these terms, Discord's requirements, or applicable law.",
      ],
    },
    {
      h: "No guarantee of results",
      p: [
        "Victress gives players tools to practice, show their work and be found. We do not promise any result: not a ranking, a roster spot, a scholarship, a sponsorship or an opportunity. Recruitment and discovery features are not an offer of employment, a contract or a placement, and Victress is not a party to anything between a player and a team, coach or school.",
      ],
    },
    {
      h: "Verification",
      p: [
        "When Victress shows that evidence is verified, it means we can show where the evidence came from and that it has not been changed. Verification never judges how good a player is, and it is not a prediction of ability, potential or fit.",
      ],
    },
    {
      h: "Payments",
      p: [
        "Paid plans are processed by Stripe. Prices, billing, cancellation and refunds are described on the Cancellation and Refunds page, which is part of these terms.",
      ],
    },
    {
      h: "Changes",
      p: [
        "We may update these terms. If a change matters, we will update the date at the top and email account holders. Using Victress after a change means you accept it.",
      ],
    },
    {
      h: "Ending your use",
      p: [
        "You can stop using Victress and delete your account at any time (see the Privacy page). You can also disconnect integrations or stop using the Discord bot. A server administrator can remove the bot from their server.",
        "We can suspend or end your access if you break these terms. Sections that by their nature should continue, such as content permissions already granted, limits of liability, and dispute related provisions, continue after your account ends to the extent permitted by law.",
      ],
    },
    {
      h: "Limits of liability",
      p: [
        "Victress is provided as it is. To the fullest extent the law allows, Victress LLC is not liable for indirect, incidental or consequential damages, or for lost opportunities, and our total liability for any claim is limited to the fees you paid us in the 12 months before the claim, with a minimum of 100 US dollars. Nothing here limits a right you have that the law does not allow us to limit.",
      ],
    },
    {
      h: "Governing law and contact",
      p: [
        `These terms are governed by the laws of the State of Utah, United States. Questions: ${PRIVACY_EMAIL}.`,
      ],
    },
  ],
};

export const refundsDoc: LegalDoc = {
  title: "Cancellation and Refunds",
  updated: UPDATED,
  intro:
    "This page explains how paid plans are billed, how to cancel and when you can get a refund. The Rookie plan is free and has nothing to cancel.",
  sections: [
    {
      h: "Plans and prices",
      list: [
        "Rookie: free.",
        "Pro: $7.99 per month, or $75 per year.",
        "Team: $49 per month, per roster.",
        "Scout: $249 per month.",
      ],
      p: ["Team is billed per roster: each roster needs its own Team plan. Prices are in US dollars."],
    },
    {
      h: "Cancel any time",
      p: [
        `You can cancel at any time. Until the billing portal exists, send cancellation and refund requests by email to ${CONTACT_EMAIL} from the address on your account. Your plan stays active until the end of the period you have paid for, then it ends and your account returns to Rookie.`,
      ],
    },
    {
      h: "Refunds",
      list: [
        "Monthly plans: we do not give prorated refunds for a partial month. You keep access to the end of the month you paid for.",
        "Annual plans: you can ask for a full refund within 14 days of your first purchase. Email us from the address on your account and we will refund it. Refund requests go by email until the billing portal exists.",
      ],
    },
    {
      h: "Failed payments",
      p: [
        "If a payment fails, your plan stays active for a 7 day grace period while we and Stripe try again. If the payment is not made by the end of the grace period, your account returns to Rookie until a payment succeeds.",
      ],
    },
    {
      h: "Contact",
      p: [`Questions about billing or a refund request: ${CONTACT_EMAIL}.`],
    },
  ],
};
