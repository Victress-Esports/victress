// Final plain English legal pages (founder approved 2026-11-07). They describe only what Victress does today, make no
// compliance or security claim that is not true, and avoid hyphens and dashes like the rest of the marketing copy.
// Facts below come from the code and schema: Supabase Auth, database and file storage; Vercel hosting; Resend email; Stripe for
// paid plans; no advertising or third party tracking tags. Prices come from content/pricing.ts and are repeated on the refunds page.
import { CONTACT_EMAIL } from "@/content/copy";

export interface LegalSection {
  h: string;
  p?: string[];
  list?: string[];
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
  updated: UPDATED,
  intro:
    "This page explains what Victress collects, why, who sees it and how you control it. Victress is an esports player development and recruitment platform. We keep it plain and we describe only what we do today.",
  sections: [
    {
      h: "What we collect",
      list: [
        "Your account: your email address, and the sign in method you choose (an email link, Discord or Google). If you use Discord or Google, we receive the details that service shares for sign in. We do not copy your real name or photo from them into your profile.",
        "Your profile: the name you pick, and anything you add such as a display name, bio, profile photo, your games, roles and ranks, tournaments, and links to highlights you host elsewhere.",
        "Your team: a team name and who is on the roster, if you start or join a team. Invite links are codes that let someone join your team.",
        "Your match log: practice matches you record. It is private to you.",
        "Game imports: if you are approved and connect a Riot ID, we store that Riot ID and the League of Legends matches we fetch for it from Riot's API (results, your numbers, and the other players in each match as anonymous entries with no names). They are private to you. You can delete a match or all of it at any time.",
        "Practice files: if you are approved as a design partner and upload a demo or replay file, it is stored privately with the file name and size.",
        "Game stats from earlier versions: earlier versions of Victress let players enter game stats. We still hold what was entered. We do not show it to anyone.",
        "Messages you send us: the contact and design partner forms send your details to our email inbox. They are not stored in the Victress database.",
        "Waitlist: your email address and the plan you are interested in.",
        "Product activity: a short list of events in our own database so we can see whether Victress works for people, such as starting to sign up, finishing sign up, completing a profile, starting a game import, viewing a first analysis, and coming back on a later day. Each event has a name, a date and, once you have an account, your account. We do not record your IP address, device, or the pages you browse in this list, and we share it with no one. Events are deleted after 12 months, and sooner if you delete your account.",
        "Basic technical data: our hosting provider records requests to the site (such as your IP address, the page and the time) so the site works and stays secure.",
      ],
    },
    {
      h: "Why we use it",
      list: [
        "To run your account and show you your own profile, resume and team.",
        "To let you decide what others can see, and to show only that.",
        "To send you emails you need, such as sign in links, a welcome message and a confirmation that we received a form.",
        "To keep Victress working, safe and fair, including handling reports of abuse.",
        "To count how many people reach each step of using Victress, so we can fix what gets in the way.",
        "To process payments for paid plans, when you choose one.",
      ],
      p: ["We do not use your information for advertising, and we do not run advertising or third party tracking tags on the site."],
    },
    {
      h: "Who we share it with",
      p: [
        "We do not sell your data. We share information only with service providers who help us run Victress, and only as needed:",
      ],
      list: [
        "Supabase: sign in, the database and private file storage.",
        "Vercel: hosting and delivery of the site.",
        "Resend: sending email.",
        "Stripe: payments for paid plans. Stripe handles your card details. We do not see or store your card number.",
        "Discord and Google: only if you choose them to sign in.",
      ],
    },
    {
      h: "Public and private profiles",
      p: [
        "Your profile is private by default. Nobody else can see it unless you choose to share it, and the choices are yours: which fields others can see, whether your profile is listed publicly, and whether search engines may list it.",
        "Private links let you share a view of your profile with a person you choose. You pick what the link shows and when it expires, and you can turn it off at any time.",
        "If you upload a profile photo, it is stored in a place where anyone who has the exact address of the photo can open it. Choose a photo you are comfortable with.",
        "We do not show contact details or private identity to anyone without your consent. Victress does not let people message you.",
      ],
    },
    {
      h: "Your choices and your data",
      p: [
        "You can change your profile, privacy choices and links in your dashboard at any time.",
        `To see your data, correct it, or delete your account, email ${CONTACT_EMAIL} from the address on your account. We delete your account, profile, team membership and uploaded files, and we confirm by email. We act on requests as quickly as we can and no later than 30 days. We may keep a limited record where the law requires it or where it is needed to stop abuse.`,
        "If you are a parent or guardian and believe a child under 13 has given us information, email us and we will delete it.",
      ],
    },
    {
      h: "How long we keep it",
      list: [
        "Account and profile information: until you delete your account.",
        "Uploaded practice files: until you delete them or your account.",
        "Waitlist emails: until you ask us to remove them or we have contacted you about the plan.",
        "Messages sent through our forms: in our email inbox for as long as we need them to reply and keep records.",
        "Technical logs: kept by our providers for a short time under their own settings.",
      ],
    },
    {
      h: "Security",
      p: [
        "Connections to Victress use HTTPS. Access to the database is restricted so that people can read only their own private data and the parts of a profile its owner chose to share. Private files are private by default. No system is perfectly secure, and we cannot promise that it is.",
      ],
    },
    {
      h: "Age",
      p: [
        "You must be at least 13 to use Victress. We do not knowingly collect information from anyone under 13 and we delete it if we learn we have.",
      ],
    },
    {
      h: "Changes and contact",
      p: [
        "If we change this page in a way that matters, we will update the date at the top and tell account holders by email.",
        `Questions or requests: ${CONTACT_EMAIL}.`,
      ],
    },
  ],
};

export const termsDoc: LegalDoc = {
  title: "Terms",
  updated: UPDATED,
  intro:
    "These terms are the rules for using Victress, an esports player development and recruitment platform run by Victress LLC. By creating an account or using the site you agree to them.",
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
      ],
    },
    {
      h: "Acceptable use",
      p: ["Use Victress fairly. You agree not to:"],
      list: [
        "harass, threaten, bully, stalk or abuse anyone, or share someone's private information;",
        "post hate, sexual content involving minors, or anything illegal;",
        "pretend to be another person or organization;",
        "post information that is not yours or that you have no right to share, including other people's private details inside files you upload;",
        "scrape the site, attack it, or try to get around its limits or privacy controls;",
        "use Victress to spam or mislead others.",
      ],
    },
    {
      h: "Harassment and abuse",
      p: [
        "Everyone should be able to compete and be seen safely. We take harassment seriously, including harassment aimed at women competitors. To report a person, a profile or content, email " +
          `${CONTACT_EMAIL} with the word Report in the subject and tell us what happened. We review reports, we may act without notice, and we do not tell the person reported who made the report.`,
      ],
    },
    {
      h: "Content you submit",
      p: [
        "You own what you submit. You give Victress permission to store it and show it as you choose in the product, for example on your profile and in links you create. You promise you have the right to submit it. You can remove it at any time.",
      ],
    },
    {
      h: "Our right to remove content or accounts",
      p: [
        "We may remove content, limit features or close an account that breaks these terms, puts others at risk, or that the law requires us to act on. Where we can, we will tell you why.",
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
        "You can stop using Victress and delete your account at any time (see the Privacy page). We can suspend or end your access if you break these terms. Sections that by their nature should continue, such as limits of liability, continue after your account ends.",
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
        `These terms are governed by the laws of the State of Utah, United States. Questions: ${CONTACT_EMAIL}.`,
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
