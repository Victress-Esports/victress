# Partner Experience: product and development specification

Source: Partner_Experience.docx converted to text, Victress-Partner-Handoff.md Part 3 (2026-11-09).

NOTE: this specification contains one line that conflicts with the approved brief above: "Do not create a separate $85,000 self-service Stripe subscription for category exclusivity." The approved brief resolves it: the $85,000 offering exists, but it is not a self-service checkout subscription. The partner requests it in the dashboard, Victress approves the category, and payment is by Stripe invoice. Follow the brief.

VICTRESS

Partner Experience

Product & Development Specification

Document purpose: Product strategy, functional requirements, user experience, terminology, account structure, and technical implementation.

Product: Victress Partner
Platform: victress.gg
Related initiatives: Victress Women in Esports
Status: Primary product and development specification

1. Product Overview

What is Victress Partner?

Victress Partner is the organizational account experience within the Victress platform. It gives brands, businesses, educational institutions, nonprofits, esports organizations, and other organizations a way to participate in the growth and development of esports.

Partners can understand the challenges affecting the esports ecosystem, contribute resources and expertise, support initiatives, create opportunities, and see the results of their participation.

Victress connects these activities to its broader player development and recruitment ecosystem.

Partner organizations are not simply purchasing access to player statistics. They are participating in an ecosystem that connects competitive development, education, resources, community participation, and career opportunities.

The strategic foundation

Victress Partner operates around three related concepts:

Partner
The organizational account type within Victress.

Creating Shared Value (CSV)
The strategy of connecting organizational participation with meaningful value for esports players, teams, communities, and participating organizations.

Women in Esports
The commitment to addressing barriers, expanding participation, supporting development, and creating opportunities for women in esports.

These concepts should remain distinct throughout the product, marketing materials, and development documentation.

Women in Esports is a shared-value initiative under the Victress brand. It is not a replacement for Victress's primary commercial platform.

What partners accomplish

The Partner experience should help organizations:

-   Understand the challenges affecting esports participation and development.

-   Identify areas where their organization can contribute.

-   Provide resources, expertise, mentorship, infrastructure, and opportunities.

-   Discover initiatives that need support.

-   Participate in programs and projects.

-   Understand what their involvement accomplishes.

-   Access appropriate reporting about their contributions.

The experience should make participation straightforward, meaningful, and measurable.

The core experience

The Partner experience follows four main activities:

1.  Challenges: Understand what needs to change.

2.  Participation: Decide how to contribute.

3.  Opportunities: Find where to get involved.

4.  Impact: See what involvement accomplishes.

Overview brings these experiences together.

2. Partner Account Structure

Partner is an organizational account type within Victress.

Organizations register with their business or institutional information, establish an organization account, select an available plan, and access the Partner experience according to their permissions.

Partner accounts must support different organization sizes, resources, and levels of participation.

Partner plans

Community Partner — Free

Description

Join the Victress partner community. Discover initiatives, share opportunities, and contribute resources and expertise to help grow the esports community.

Purpose

Provide an accessible entry point for organizations that want to participate without a paid partnership commitment.

Intended organizations

-   Nonprofits

-   Community organizations

-   Grassroots esports organizations

-   Collegiate clubs and programs

-   Educational institutions

-   Smaller organizations

-   Community initiatives

Community Partners should be able to establish an organization presence and participate in appropriate areas of the platform without entering payment information.

Supporting Partner — $1,000/month or $10,000/year

Description

Support esports development through resources, expertise, and opportunities that help players, teams, and communities grow.

Purpose

Provide an ongoing paid partnership for organizations that want to contribute to the Victress ecosystem and participate more actively.

Intended organizations

-   Brands

-   Businesses

-   Gaming companies

-   Esports organizations

-   Educational institutions

-   Corporate partners

Supporting Partners receive the paid account entitlements defined in the Partner subscription configuration.

Anchor Partner — $50,000/year

Description

Take a leading role in supporting esports development and creating opportunities across the Victress ecosystem.

Purpose

Provide a higher-level annual partnership for organizations making a substantial commitment to Victress initiatives and ecosystem development.

Intended organizations

-   Major brands

-   Corporate organizations

-   Established esports organizations

-   Universities and educational institutions

-   Major institutional partners

Anchor Partners receive the applicable enhanced partnership entitlements established in their agreement.

Category Exclusivity

Category exclusivity is a negotiated partnership arrangement, not a separate self-service subscription.

An approved Anchor Partner may receive exclusive representation within an agreed business or product category.

Requirements:

-   Exclusivity must be approved by Victress.

-   The category must be explicitly defined.

-   The agreement must establish its duration and scope.

-   Pricing and payment terms must be documented in the agreement.

-   Payment should be handled through an approved invoice or negotiated payment arrangement.

-   Exclusivity must not be automatically granted through ordinary checkout.

Do not create a separate $85,000 self-service Stripe subscription for category exclusivity.

Partner plan administration

The system must support:

-   Community Partner registration.

-   Supporting Partner monthly subscriptions.

-   Supporting Partner annual subscriptions.

-   Anchor Partner annual agreements.

-   Individually approved category exclusivity.

-   Partner verification.

-   Subscription status.

-   Payment status.

-   Renewal dates.

-   Plan changes.

-   Administrative overrides.

-   Partner account suspension and reactivation.

Plan entitlements must be controlled centrally rather than scattered throughout individual pages.

3. Product Navigation & Nomenclature

All Partner interface terminology should follow the same naming principles used throughout Victress.

Use simple, familiar, descriptive language.

Avoid invented product names, unnecessary technical language, and excessive use of the word Hub.

Main navigation

The following names are the approved navigation structure.

VICTRESS

Partner

-   Overview

-   Challenges

-   Participation

-   Opportunities

-   Impact

-   Organization Settings

Overview

  -----------------------------------------------------------------------
  Previous terminology                     Approved terminology
  ---------------------------------------- ------------------------------
  Dashboard Home                           Overview

  Organization Impact at a Glance          Impact Summary

  Funded Teams                             Supported Teams

  Player Upskill Rate                      Player Development

  Community Hours                          Mentorship Hours

  Active Tier                              Partner Plan
  -----------------------------------------------------------------------

Challenges

  -----------------------------------------------------------------------
  Previous terminology                    Approved terminology
  --------------------------------------- -------------------------------
  The Challenges                          Challenges

  Regional & Title Trend Graphs           Participation Trends

  Support Gap Heatmaps                    Resource Gaps

  Toxicity & Safety Index                 Community Safety

  Participation Deficit Index             Participation Gaps

  Representation Metrics                  Representation

  Data Hub                                Remove
  -----------------------------------------------------------------------

Challenge information should be organized into:

-   Participation

-   Development

-   Representation

-   Resources

-   Safety

-   Competitive Pathways

Participation

  -----------------------------------------------------------------------
  Previous terminology                   Approved terminology
  -------------------------------------- --------------------------------
  Get Involved                           Participation

  Contribution Portal                    Remove

  Select Contribution Track              Ways to Participate

  Resource Sponsor                       Resources

  Expertise & Mentorship                 Expertise & Mentorship

  Infrastructure & Facilities            Infrastructure

  Direct Opportunity Pipelines           Opportunities

  Resource Provisioning                  Resource Support

  Resource Listing Manager               Available Resources

  Pipeline Creator                       Opportunity Creation
  -----------------------------------------------------------------------

Opportunities

  -----------------------------------------------------------------------
  Previous terminology                  Approved terminology
  ------------------------------------- ---------------------------------
  Opportunities Marketplace             Opportunities

  Listing Structure & Cards             Opportunity Listings

  Organizer                             Organization

  Target Impact                         Purpose

  Resource Need                         Support Needed

  Matching Algorithm Score              Relevance

  Pledge Support                        Offer Support

  Automated Action Flow                 Support Process

  Workspace Channel                     Discussion
  -----------------------------------------------------------------------

Impact

  -----------------------------------------------------------------------
  Previous terminology                  Approved terminology
  ------------------------------------- ---------------------------------
  Progress & Impact                     Impact

  CSV Evidence Engine                   Remove

  Initiative Cohort Telemetry           Program Results

  Skill Progression                     Player Development

  Career Mobility                       Career Opportunities

  Community Engagement                  Community Participation

  Value Generated                       Value Created

  Verified Social ROI                   Measured Impact

  Exportable Reporting                  Reports

  One-click PDF/CSV Export              Download Report
  -----------------------------------------------------------------------

Account terminology

  -----------------------------------------------------------------------
  Previous terminology                    Approved terminology
  --------------------------------------- -------------------------------
  Free Community Partner Tier             Community Partner

  Tiered Corporate & Brand Partners       Organization Partner Plans

  Active Tier                             Partner Plan

  Payment / Verification                  Payment & Verification

  Instant Dashboard                       Partner Overview

  Organization Workspace                  Organization Account
  -----------------------------------------------------------------------

Technical terminology

Technical terminology should remain precise while being understandable to developers.

  -----------------------------------------------------------------------
  Previous terminology                     Approved terminology
  ---------------------------------------- ------------------------------
  Partner Portal Dashboard                 Partner Experience

  Data Anonymization & Consent Gateway     Data Privacy & Consent Layer

  Anonymization Engine                     Data Anonymization Service

  Raw Practice Telemetry                   Practice Data

  Career Achievements                      Player Records

  Recruiting Hub                           Talent Discovery

  Aggregated CSV & Ecosystem Analytics     Aggregated Impact Data

  Opt-In Opportunities                     Player Consent
  -----------------------------------------------------------------------

4. Overview

Purpose

Overview is the organization's starting point when it signs into Victress.

It should provide a clear understanding of the organization's current partnership, participation, available opportunities, and measurable contributions.

The experience should be useful immediately without requiring the organization to navigate multiple sections to understand its account.

Overview components

Organization Information

Display:

-   Organization name.

-   Organization logo.

-   Partner plan.

-   Partnership status.

-   Organization contact.

-   Account notifications.

Impact Summary

Display relevant information about the organization's participation.

Potential summary measures include:

-   Supported Teams

-   Resources Provided

-   Mentorship Hours

-   Player Development

-   Competitive Opportunities

-   Community Participation

Only display measures that have actual supporting records.

Partner Activity

Display recent activity, such as:

-   Contributions made.

-   Opportunities created.

-   Support offered.

-   Initiatives joined.

-   Program updates.

-   Completed activities.

Available Opportunities

Show relevant initiatives that the organization may want to support.

Partnership Information

Display:

-   Current Partner Plan.

-   Billing interval.

-   Subscription or agreement status.

-   Next renewal date, where applicable.

-   Payment status.

-   Relevant partnership documents.

Overview should bring the organization's activity together without duplicating the detailed functionality of the other sections.

5. Challenges

Purpose

Challenges helps organizations understand the barriers affecting participation, development, representation, and opportunity in esports.

This section should explain what needs attention and where organizations can make a meaningful contribution.

It should combine appropriate quantitative information with research, documented findings, and community feedback.

It should not be a collection of unexplained charts.

Challenge categories

Participation

Understand participation across esports titles, competitive levels, and communities.

Potential information:

-   Participation trends.

-   Regional participation.

-   Competitive participation.

-   Participation barriers.

-   Retention patterns.

-   Participation across different levels of competition.

Development

Understand the resources and support available to players and teams.

Potential information:

-   Coaching access.

-   Training opportunities.

-   Competitive development resources.

-   Educational support.

-   Player development pathways.

Representation

Understand representation across the esports ecosystem.

Potential information:

-   Representation across competitive titles.

-   Collegiate participation.

-   Team representation.

-   Leadership and industry participation.

-   Career pathways.

Resources

Identify areas where players, teams, and organizations need additional support.

Potential information:

-   Equipment access.

-   Software access.

-   Training resources.

-   Tournament funding.

-   Travel assistance.

-   Coaching resources.

-   Facilities and infrastructure.

Safety

Understand challenges affecting community participation and player experiences.

Potential information:

-   Community safety findings.

-   Documented harassment concerns.

-   Moderation trends.

-   Safety-related community feedback.

-   Areas requiring additional support.

Sensitive personal information must not be exposed through aggregated reporting.

Competitive Pathways

Understand the opportunities and barriers between competitive levels.

Potential information:

-   Amateur participation.

-   Collegiate pathways.

-   Competitive development.

-   Tournament access.

-   Team progression.

-   Career and recruitment opportunities.

Data requirements

Challenge information may come from:

-   Victress platform activity.

-   Voluntary player and organization surveys.

-   Aggregated Scrim Intelligence information.

-   Publicly available research.

-   Documented community feedback.

-   Approved partner and initiative reporting.

Every metric must have a defined source, methodology, and reporting period.

Do not create artificial statistics, unsupported percentages, or fabricated industry benchmarks.

Where sufficient information is unavailable, show the appropriate explanation rather than displaying an invented metric.

6. Participation

Purpose

Participation is where organizations decide how they want to contribute.

Different organizations have different resources and capabilities. Some can provide funding, others can offer professional expertise, facilities, equipment, or career opportunities.

Victress should not force every organization into a traditional sponsorship model.

The Participation experience must support four contribution categories.

Four ways to participate

1. Resources

Provide financial or material support that helps players, teams, and programs access what they need.

Examples:

-   Scrim Intelligence access.

-   Software licenses.

-   Gaming equipment.

-   Tournament entry fees.

-   Travel support.

-   Training resources.

-   Team development funding.

-   Prize pools.

Organizations should be able to describe what they can provide, the quantity available, eligibility requirements, and any applicable limitations.

2. Expertise & Mentorship

Provide professional knowledge, experience, and guidance.

Examples:

-   Career mentorship.

-   Coaching.

-   Sports psychology education.

-   Marketing and communications.

-   Business development.

-   Esports law.

-   Broadcasting and production.

-   Professional development workshops.

Organizations should be able to describe the expertise available, the people providing it, the format, and the availability.

3. Infrastructure

Provide the physical and technical resources needed to support esports participation and development.

Examples:

-   Gaming facilities.

-   Bootcamp locations.

-   Equipment access.

-   Gaming hardware.

-   Training spaces.

-   Tournament facilities.

-   Technology infrastructure.

-   Dedicated game servers.

Organizations should be able to list available infrastructure and explain access requirements.

4. Opportunities

Create pathways that connect players with education, competition, and professional development.

Examples:

-   Scholarships.

-   Internships.

-   Collegiate opportunities.

-   Team tryouts.

-   Tournament participation.

-   Career opportunities.

-   Educational programs.

-   Development initiatives.

Organizations should be able to publish opportunities with clear eligibility requirements, deadlines, application instructions, and contact information.

Participation functionality

The section should support:

-   Selecting a contribution category.

-   Describing available resources or expertise.

-   Creating resource listings.

-   Defining availability.

-   Publishing opportunities.

-   Updating existing contributions.

-   Managing active offers.

-   Reviewing incoming interest.

-   Communicating with relevant organizations or initiative leaders.

Not every contribution requires a financial transaction.

A commitment to provide equipment, mentorship, facilities, or professional expertise must not automatically trigger Stripe checkout.

Financial contributions should use the appropriate payment or agreement process.

7. Opportunities

Purpose

Opportunities is where organizations discover initiatives, projects, and programs seeking participation or support.

It connects partners with real activities across the Victress ecosystem.

It should provide a clear way to understand what an initiative needs and how an organization can help.

Opportunity categories

Examples include:

-   Team Development

-   Tournament Support

-   Collegiate Programs

-   Scholarships

-   Mentorship Programs

-   Community Initiatives

-   Career Opportunities

These categories should be expandable as the ecosystem grows.

Opportunity listings

Each listing should include:

Organization

Who created or manages the opportunity.

Purpose

What the initiative is trying to accomplish.

Support Needed

The type of support requested, such as:

-   Financial support.

-   Equipment.

-   Software.

-   Coaching.

-   Mentorship.

-   Facilities.

-   Infrastructure.

-   Professional expertise.

Eligibility

Who can participate or benefit.

Location

Where the opportunity applies, when relevant.

Timeline

Important dates, deadlines, and expected duration.

Contact

The responsible organization or initiative contact.

Relevance

How closely the opportunity aligns with the partner's interests and stated participation areas.

Relevance must be based on defined matching criteria. Do not display an invented compatibility score.

Offer Support

Use Offer Support rather than Pledge Support.

The action must work for financial and non-financial contributions.

When an organization selects Offer Support:

1.  Display the support being requested.

2.  Allow the organization to indicate what it can provide.

3.  Collect any necessary information.

4.  Submit the offer.

5.  Notify the responsible organization.

6.  Track the support process.

7.  Record the outcome when the contribution is completed.

Financial commitments should proceed through an approved payment or invoicing workflow.

Non-financial offers should create a discussion or coordination process between the participating organizations.

An offer must not be treated as a completed contribution until it has been accepted and fulfilled.

8. Impact

Purpose

Impact demonstrates what organizational participation accomplishes.

It is an important part of the Partner experience because organizations need to understand the value of their involvement and communicate their contributions internally.

Impact should provide documented evidence rather than vanity metrics.

Reporting categories

Resources Provided

Track resources contributed by the organization.

Examples:

-   Financial contributions.

-   Equipment provided.

-   Software licenses.

-   Tournament support.

-   Travel assistance.

-   Training resources.

Teams Supported

Track teams receiving documented support.

Potential information:

-   Number of teams supported.

-   Type of support.

-   Duration of support.

-   Programs receiving assistance.

Player Development

Report appropriate development information from supported programs.

Potential information:

-   Training participation.

-   Development program completion.

-   Aggregated performance changes.

-   Coaching participation.

Where Scrim Intelligence information is used, it must be aggregated and appropriately anonymized.

Mentorship & Education

Track:

-   Mentorship sessions.

-   Workshop attendance.

-   Education program participation.

-   Professional development activities.

-   Mentorship hours.

Competitive Opportunities

Track:

-   Tournament participation.

-   Competitive program participation.

-   Team opportunities.

-   Collegiate opportunities.

-   Other documented competitive pathways.

Career Progression

Report documented career-related activities.

Examples:

-   Internship participation.

-   Scholarship applications and awards, where verified.

-   Collegiate opportunities.

-   Recruitment-related activity.

-   Career program participation.

Individual player information requires appropriate permission.

Community Participation

Track:

-   Initiative participation.

-   Community program attendance.

-   Events supported.

-   Volunteer participation.

-   Community activities.

Measured Impact

Impact reporting should distinguish between:

1.  What the partner contributed.

2.  What activity took place.

3.  What outcomes were documented.

4.  What changes were observed.

Do not automatically claim that a partner's contribution caused an outcome simply because the outcome occurred afterward.

Reporting

The system should support:

-   Date-range reporting.

-   Contribution summaries.

-   Program results.

-   Impact summaries.

-   PDF reports.

-   CSV exports where appropriate.

-   Historical reporting.

Reports should be suitable for internal organizational reporting, board presentations, partnership reviews, and corporate social impact reporting.

Reporting must only include information Victress can substantiate.

9. Data Privacy & Player Consent

Purpose

The Partner experience must maintain a clear boundary between organizational impact information and individual player information.

Partners should receive useful ecosystem information without receiving unrestricted access to private player data.

Data sources

The Victress platform contains three primary product areas relevant to Partner.

Scrim Intelligence

Provides competitive practice analysis and performance information.

Partner reporting may use appropriately aggregated and anonymized information to demonstrate development activity and program results.

Partners do not automatically receive access to:

-   Individual player telemetry.

-   Detailed match analysis.

-   Private performance records.

-   Individual competitive evaluations.

Player Resume

Provides player profiles, records, achievements, and career information.

Partner accounts do not automatically receive access to individual Player Resumes.

Players must explicitly consent before their individual information is shared for a relevant opportunity or process.

Scout Desk

Provides talent discovery and recruitment functionality.

Partners do not receive unrestricted access to Scout Desk or its recruitment information.

Any integration involving individual player information must follow the applicable permission and consent requirements.

Data flow

Scrim Intelligence:

Practice Data → Data Anonymization Service → Aggregated Impact Data → Partner Experience

Player Resume:

Player Records → Explicit Player Consent → Authorized Opportunity or Sharing Process

Scout Desk:

Talent Discovery → Applicable Player Permissions → Authorized Recruitment or Opportunity Process

Privacy requirements

-   Do not expose private player information in Partner dashboards.

-   Aggregate and anonymize information where appropriate.

-   Apply minimum reporting thresholds to prevent individuals from being identified through small groups.

-   Record player consent.

-   Make permission scope clear.

-   Allow consent to be withdrawn where applicable.

-   Restrict access to authorized users.

-   Log relevant data-sharing activity.

-   Prevent partners from accessing internal recruitment evaluations.

-   Do not expose private Scrim Intelligence records through Partner reporting.

The Data Privacy & Consent Layer must be enforced at the backend and API level, not just through interface visibility.

10. Partner Registration & Account Access

Purpose

Organizations should be able to establish a Partner account through a straightforward registration process.

The registration experience should collect the information needed to identify the organization, establish its account, and configure appropriate access.

Registration flow

Organization Registration → Organization Details → Partner Plan → Payment & Verification → Organization Account → Overview

Organization information

Collect appropriate information such as:

-   Organization name.

-   Organization type.

-   Website.

-   Organization email.

-   Organization description.

-   Country and location.

-   Logo.

-   Primary contact.

-   Areas of interest.

-   Preferred participation categories.

Verification

Verification should establish that an organization is legitimate and that the person registering is authorized to represent it.

Possible methods:

-   Organization email verification.

-   Business or institutional domain verification.

-   Manual administrative review.

-   Additional documentation where necessary.

Community Partner registration should remain accessible without unnecessary payment or verification barriers.

Higher-level partnerships may require additional review or an agreement.

Account structure

An organization account should support:

-   Organization profile.

-   Partner plan.

-   Authorized users.

-   Account permissions.

-   Billing information.

-   Contributions.

-   Opportunities.

-   Impact reporting.

-   Organization settings.

Support multiple authorized users where appropriate, with role-based permissions.

The organization account should remain separate from individual player accounts.

11. Stripe Integration & Payment Requirements

Purpose

Stripe is the payment processor for paid Victress Partner plans.

Do not introduce another payment processor or build a separate payment processing system.

The integration should support subscription billing, payment collection, invoices, and appropriate payment tracking.

Partner payment methods

Support:

Credit and Debit Cards

Standard Stripe card payments.

ACH Direct Debit

Allow eligible U.S. organizations to pay directly from their bank accounts.

Bank Transfers

Support Stripe's available bank transfer payment methods and invoice workflows.

Wire Transfers

Allow organizations to pay through supported Stripe bank transfer instructions and reconciliation processes.

Invoices

Allow organizations to request or receive invoices when their accounting departments require an invoice before payment.

Checks

Support manually recording and reconciling checks received outside Stripe.

Checks should not be represented as automatically processed Stripe payments.

Payment configuration

Community Partner

-   No payment required.

-   No payment method required.

-   No Stripe checkout required.

-   Free account registration.

Supporting Partner

-   $1,000 monthly.

-   $10,000 annually.

-   Recurring Stripe subscription.

-   Card payments.

-   ACH where supported by the selected Stripe integration.

-   Appropriate payment status tracking.

Anchor Partner

-   $50,000 annually.

-   Annual partnership agreement.

-   Card, ACH, or approved invoice-based payment.

-   Bank transfer payment where supported.

-   Administrative approval where required.

Category Exclusivity

-   Individually negotiated agreement.

-   Victress administrative approval.

-   Contract-specific pricing.

-   Invoice-based payment or other approved payment arrangement.

-   No separate self-service subscription product.

Stripe implementation

Use Stripe Checkout, Billing, and Invoicing as appropriate to the payment flow.

Configure the available payment methods for the Victress Stripe account.

The developer must verify that the selected Stripe integration supports the desired payment methods and subscription or invoice workflows.

Do not assume every payment method is available in every checkout configuration.

Payment status management

Track:

-   Pending payment.

-   Successful payment.

-   Failed payment.

-   Outstanding invoice.

-   Paid invoice.

-   Refunded payment.

-   Subscription status.

-   Renewal date.

-   Cancellation.

-   Manual payment reconciliation.

Use Stripe webhooks to synchronize payment events with Victress.

Do not grant paid entitlements solely because a checkout session was initiated.

Access should reflect confirmed payment or an explicitly approved administrative arrangement.

Billing management

Organizations should be able to:

-   View their current plan.

-   View billing information.

-   Review payment history.

-   Access invoices.

-   Update payment methods where supported.

-   Review renewal dates.

-   Manage eligible subscription changes.

-   Request assistance with billing.

12. Integrations With the Victress Platform

Partner must operate as part of the existing Victress ecosystem.

It should not become an isolated application or duplicate the functionality of the other product areas.

Scrim Intelligence integration

Purpose:

Provide appropriate aggregated development information for Partner reporting.

Potential integration:

-   Aggregated team development measures.

-   Supported team activity.

-   Practice participation.

-   Program-level results.

-   Appropriate historical comparisons.

Individual competitive analysis remains within Scrim Intelligence.

Player Resume integration

Purpose:

Support appropriate player opportunities and permission-based sharing.

Potential integration:

-   Opportunity applications.

-   Player-submitted resumes.

-   Authorized profile sharing.

-   Verified career records where permission exists.

Partner organizations should not automatically gain access to player profiles.

Scout Desk integration

Purpose:

Support authorized recruitment and talent opportunity pathways.

Potential integration:

-   Recruitment-related opportunities.

-   Collegiate pathways.

-   Authorized player applications.

-   Permission-based talent discovery processes.

Partner access must not bypass Scout Desk permissions.

Shared platform requirements

-   Reuse the existing Victress authentication system.

-   Use existing organization and player relationships where appropriate.

-   Maintain consistent user permissions.

-   Avoid duplicate player records.

-   Maintain a consistent design system.

-   Use existing notification infrastructure where available.

-   Keep integration boundaries clear.

13. Organization Settings

Purpose

Organization Settings allows authorized organization users to manage their account.

Settings areas

Organization Profile

-   Organization name.

-   Logo.

-   Description.

-   Website.

-   Organization type.

-   Location.

-   Contact information.

Organization Users

-   Invite users.

-   Manage authorized users.

-   Assign roles.

-   Remove access.

-   Review permissions.

Partner Plan

-   Current plan.

-   Plan details.

-   Billing interval.

-   Partnership status.

-   Renewal information.

-   Agreement details.

Payment & Verification

-   Payment history.

-   Invoices.

-   Payment methods.

-   Verification status.

-   Billing contact.

Notifications

-   Opportunity updates.

-   Contribution activity.

-   Program updates.

-   Billing notifications.

-   Account notifications.

14. Administration & Partner Management

Victress administrators need an internal management experience for overseeing organizations and partnerships.

This should not be confused with the external Partner dashboard.

Administrative functionality

Administrators should be able to:

-   View registered organizations.

-   Review organization information.

-   Verify organizations.

-   Approve or reject partnership applications where required.

-   Assign or change Partner plans.

-   Manage subscription status.

-   Record approved manual payments.

-   Manage agreements.

-   Approve category exclusivity.

-   Manage organization access.

-   Review contributions.

-   Review opportunity listings.

-   Monitor support offers.

-   Review reporting data.

-   Suspend or reactivate accounts.

Partnership management

For Anchor Partners and exclusive arrangements, administrators should be able to maintain:

-   Partnership agreement.

-   Contract start date.

-   Contract end date.

-   Payment terms.

-   Approved category.

-   Exclusivity duration.

-   Partnership contact.

-   Approved entitlements.

-   Renewal information.

Administrative overrides must be logged.

15. Functional Requirements

The following requirements define the expected behavior of the Partner experience.

Account functionality

-   Organizations can register.

-   Organizations can create an account.

-   Organizations can select an available plan.

-   Community Partners can register without payment.

-   Paid plans connect to Stripe.

-   Organization users have appropriate permissions.

-   Partner plan entitlements are enforced consistently.

Dashboard functionality

-   Overview displays organization information.

-   Overview displays partnership status.

-   Overview displays verified participation information.

-   Overview displays relevant opportunities.

-   Dashboard information updates from the underlying records.

Challenges functionality

-   Display available challenge categories.

-   Display supporting information and research.

-   Display relevant aggregated metrics.

-   Explain data sources and reporting periods.

-   Avoid unsupported metrics.

Participation functionality

-   Support four contribution categories.

-   Allow organizations to describe available contributions.

-   Allow organizations to manage resource listings.

-   Allow organizations to publish opportunities.

-   Track offers and contribution status.

Opportunities functionality

-   Display relevant listings.

-   Support appropriate filtering.

-   Display opportunity requirements.

-   Allow partners to offer support.

-   Notify responsible organizations.

-   Track the support process.

Impact functionality

-   Record contributions.

-   Associate contributions with initiatives.

-   Track supported activities.

-   Display verified results.

-   Support reporting periods.

-   Generate PDF and CSV reports where implemented.

Privacy functionality

-   Enforce backend permissions.

-   Apply aggregation and anonymization.

-   Record consent.

-   Restrict individual data access.

-   Maintain appropriate audit logs.

Payment functionality

-   Support Stripe card payments.

-   Support ACH where configured.

-   Support Stripe bank transfer invoicing where configured.

-   Support invoice workflows.

-   Support manual check reconciliation.

-   Synchronize payment status.

-   Apply entitlements based on payment and agreement status.

16. Design & User Experience Requirements

The Partner experience should feel like a natural part of Victress.

It should not look like a separate corporate sponsorship application.

Interface principles

Simple

Use straightforward language and familiar navigation.

Clear

Organizations should understand what each section does and what actions are available.

Useful

Prioritize actual participation and information over decorative dashboard elements.

Consistent

Use the existing Victress design system, components, typography, colors, and navigation conventions.

Credible

Display only supported metrics, real contributions, and verified outcomes.

Content principles

-   Use concise headings.

-   Use short, descriptive labels.

-   Avoid unnecessary technical terminology.

-   Avoid corporate jargon.

-   Avoid invented feature names.

-   Avoid excessive subtitles.

-   Explain actions in plain language.

-   Make financial and non-financial participation equally understandable.

The interface should communicate that organizations are participating in the Victress ecosystem, not simply purchasing advertising placements.

17. Data Model & Technical Considerations

The implementation should reuse the existing Victress architecture and follow established repository conventions.

The following are the logical entities the Partner experience needs to manage. They should be mapped to existing database structures where possible rather than duplicated unnecessarily.

  ------------------------------------------------------------------------------------
  Entity                      Purpose
  --------------------------- --------------------------------------------------------
  Organization                Organization account and profile

  Organization User           Users associated with an organization

  Partner Plan                Plan definitions and pricing

  Partner Subscription        Recurring subscription records

  Partnership Agreement       Contract-based partnerships

  Partner Entitlement         Features and access permissions

  Organization Verification   Verification status and records

  Contribution                Resources, expertise, infrastructure, or other support

  Resource Listing            Available resources

  Opportunity                 Published opportunity

  Support Offer               Organization's offer to support an initiative

  Initiative                  Program or project receiving support

  Contribution Record         Completed and documented contributions

  Impact Record               Verified program results and reporting data

  Player Consent              Permission for authorized information sharing

  Invoice                     Billing and payment records

  Payment Record              Confirmed payment and reconciliation information
  ------------------------------------------------------------------------------------

Implementation principles

-   Reuse existing authentication and organization relationships.

-   Avoid duplicating existing product functionality.

-   Separate subscription status from partnership agreement status.

-   Separate an offer of support from a completed contribution.

-   Maintain clear data ownership.

-   Enforce access permissions server-side.

-   Maintain payment and consent auditability.

-   Use defined reporting methodologies.

-   Keep plan entitlements configurable.

18. Development Priorities

The Partner experience should be developed in a practical sequence.

Phase 1 — Partner Foundation

Establish the account and commercial structure.

-   Organization registration.

-   Organization profiles.

-   Partner account type.

-   Community Partner access.

-   Supporting Partner subscription.

-   Anchor Partner agreement.

-   Stripe integration.

-   Payment status management.

-   Organization Settings.

-   Role-based access.

-   Partner Overview.

Phase 2 — Participation & Opportunities

Build the primary participation experience.

-   Challenges structure.

-   Participation categories.

-   Resource listings.

-   Expertise and mentorship listings.

-   Infrastructure listings.

-   Opportunity creation.

-   Opportunity discovery.

-   Offer Support workflow.

-   Organization notifications.

-   Contribution tracking.

Phase 3 — Impact & Reporting

Build the reporting experience.

-   Impact Summary.

-   Contribution records.

-   Supported Teams reporting.

-   Mentorship and education reporting.

-   Program Results.

-   Community Participation.

-   Reporting periods.

-   PDF exports.

-   CSV exports.

-   Appropriate aggregated Scrim Intelligence integration.

Phase 4 — Advanced Integrations

Expand the ecosystem connections.

-   Permission-based Player Resume sharing.

-   Authorized Scout Desk opportunity pathways.

-   Advanced program reporting.

-   Improved opportunity relevance.

-   Partnership administration.

-   Category exclusivity management.

-   Additional reporting capabilities.

Development phases describe implementation priorities, not promises that all functionality is currently available.

19. Acceptance Criteria

The Partner experience should not be considered complete simply because the dashboard pages exist.

The following conditions must be met.

Account and Plans

-   An organization can register successfully.

-   A Community Partner can access the free account without payment details.

-   Supporting Partner monthly and annual billing work correctly.

-   Anchor Partner agreements can be managed.

-   Category exclusivity requires administrative approval and an agreement.

-   Plan permissions are enforced.

Participation

-   An organization can identify ways to contribute.

-   All four contribution categories are represented.

-   Contributions can be submitted and tracked.

-   Non-financial offers do not trigger unnecessary payment processing.

Opportunities

-   Organizations can discover available opportunities.

-   Opportunity details are complete and understandable.

-   Organizations can offer support.

-   Support offers can be reviewed and tracked.

Impact

-   Contributions are recorded.

-   Reports use actual supporting records.

-   Metrics have defined sources and methodologies.

-   Reporting distinguishes contributions from outcomes.

-   Exported reports contain only authorized information.

Privacy

-   Partner accounts cannot access unrestricted player data.

-   Individual information requires appropriate permission.

-   Backend authorization is enforced.

-   Consent records are maintained.

Payments

-   Stripe payments are recorded accurately.

-   ACH and bank transfer methods are configured appropriately.

-   Invoices can be issued and reconciled.

-   Manual check payments can be recorded.

-   Failed and outstanding payments are handled.

-   Paid access reflects confirmed payment or approved agreement status.

20. Final Product Direction

Victress Partner should be built as an organizational participation experience within the larger Victress ecosystem.

Its purpose is to connect organizations with the people, programs, resources, and opportunities that help esports grow.

The experience must give organizations a clear understanding of:

-   What challenges exist.

-   Where their organization can contribute.

-   Which opportunities need support.

-   What their involvement accomplishes.

The four primary experiences communicate this clearly:

Challenges — Understand what needs to change.

Participation — Decide how to contribute.

Opportunities — Find where to get involved.

Impact — See what your involvement accomplishes.

Overview brings everything together.

Partner accounts should provide a meaningful way for organizations to participate whether they are a free Community Partner, a Supporting Partner, or an Anchor Partner.

Victress should connect their participation to the broader player development, competitive, educational, and recruitment ecosystem while protecting player information and maintaining the integrity of its products.

The result should be a connected organizational experience that creates value for participating organizations and the esports community.

END OF PRODUCT & DEVELOPMENT SPECIFICATION

Authoritative terminology: Victress Partner Experience
Primary platform: victress.gg
Related initiative: Victress Women in Esports
Core navigation: Overview · Challenges · Participation · Opportunities · Impact · Organization Settings
