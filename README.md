# Hello Aisha Listener

BUILD A PRODUCTION-READY, MOBILE-FIRST APPLICATION CALLED:

HELLO AISHA

TAGLINE:

Someone is here to listen.

====================================================

CORE PRODUCT CONCEPT

====================================================

Hello Aisha is a safe, private conversation application where adult users can communicate with Aisha.

IMPORTANT:

Aisha is a REAL HUMAN.

Aisha is NOT an AI chatbot.

The application must NEVER generate fake messages pretending to be sent by Aisha.

Every message shown as coming from Aisha must actually be sent by the authenticated Aisha/listener account.

The app provides:

- Friendly conversations

- Human connection

- Someone to listen

- General peer support

- Mature and respectful conversation

The app is NOT:

- A dating application

- A random stranger chat application

- An anonymous random chat application

- A therapy application

- A psychologist service

- A medical service

- A depression treatment application

- An emergency service

Do not make medical, therapeutic, diagnostic, treatment, cure, or emergency-response claims.

Use language such as:

"Friendly conversation and peer support."

"Someone is here to listen."

"You can talk when you need someone to listen."

====================================================

VERSION 1 PRODUCT MODEL

====================================================

For Version 1:

There is ONLY ONE listener:

AISHA

Users cannot:

- Chat with each other

- Search other users

- View other user profiles

- Randomly match with strangers

- Swipe profiles

- Join dating features

- Send friend requests

The ONLY conversation flow is:

USER → AISHA

Build the architecture so additional verified listeners can be added in the future.

But DO NOT display multiple listeners in Version 1.

====================================================

TARGET AUDIENCE

====================================================

This application is designed for adults aged 18 and above.

Create an age confirmation screen.

The user must confirm:

"I confirm that I am 18 years of age or older."

Do not design the application for children.

Do not use child-focused graphics, language, or marketing.

====================================================

DESIGN DIRECTION

====================================================

Create a premium, warm, emotionally safe mobile experience.

Design style:

- Modern

- Minimal

- Mature

- Friendly

- Trustworthy

- Calm

- Premium

Primary colors:

Deep purple

Soft violet

Warm pink accents

Use:

- Rounded cards

- Clean typography

- Soft shadows

- Generous spacing

- Subtle animations

- Large accessible touch targets

Avoid:

- Dating app appearance

- Swipe card UI

- Sexualized imagery

- Childish design

- Medical dashboard appearance

- Overly dark or depressing visuals

The experience should communicate:

"You are not alone."

====================================================

APP ICON / BRAND ASSETS

====================================================

Use the provided approved Hello Aisha visual branding assets where available.

Do not automatically generate additional misleading badges.

Do not add:

- Fake notification indicators

- "No.1"

- "Best App"

- "Most Popular"

- Rankings

- Awards

- Download claims

- Limited-time promotional claims

Do not put misleading promotional information into branding.

====================================================

ONBOARDING

====================================================

SCREEN 1

Title:

Hi, I'm Aisha

Text:

"Sometimes you don't need advice.

You just need someone who listens."

Button:

Continue

SCREEN 2

Title:

What brings you here today?

Allow users to optionally select one or more:

- Feeling lonely

- Need someone to talk to

- Feeling stressed

- Going through a difficult time

- Just want to talk

IMPORTANT:

These options must only help personalize the conversation experience.

Do NOT:

- Diagnose depression

- Diagnose anxiety

- Diagnose mental illness

- Label the user medically

SCREEN 3 — SAFETY AND TERMS

Require the user to acknowledge:

"I confirm that I am 18 years or older."

"I agree to the Community Guidelines and Terms of Service."

"I understand that Hello Aisha provides friendly conversation and peer support. It is not professional therapy, medical care, or emergency support."

The user must explicitly accept required terms before starting a conversation.

====================================================

AUTHENTICATION

====================================================

Implement:

1. Google Sign-In

2. Email authentication

After signup:

Ask the user to create a display username.

Example:

BlueSky21

Do NOT require:

- Phone number

- Exact location

- Home address

- Profile photo

- Real full name

The user's email address must not be displayed publicly.

====================================================

HOME SCREEN

====================================================

Create a beautiful home screen.

Display:

Hello, [Username]

Show the Aisha profile.

AISHA

Badge:

REAL PERSON

Subtitle:

Friendly conversation and peer support.

IMPORTANT:

Only display "Real Person" because Aisha genuinely is a real human.

Do not display misleading availability information.

----------------------------------------------------

AISHA AVAILABILITY STATES

STATE 1:

AVAILABLE

Display:

Aisha is available

Button:

Talk to Aisha

STATE 2:

AWAY

Display:

Aisha is away right now.

Text:

"You can leave a message and Aisha will reply when available."

Button:

Leave a message

STATE 3:

NOT ACCEPTING NEW CONVERSATIONS

Display:

Aisha is not accepting new conversations right now.

Do not falsely display a wait time.

====================================================

CONVERSATION REQUEST SYSTEM

====================================================

When users want to talk to Aisha:

Optionally ask:

What would you like to talk about?

Options:

- Life

- Loneliness

- Relationships

- Stress

- Family

- Career

- Just talk

Users may skip this step.

Create a conversation request.

Conversation statuses:

REQUESTED

WAITING

ACTIVE

CLOSED

DECLINED

====================================================

QUEUE SYSTEM

====================================================

Aisha may receive many requests.

Implement a fair conversation queue.

When a user enters the queue:

Display:

"Your conversation request has been received."

Do NOT promise an exact response time.

Optionally display:

"Wait times may vary depending on availability."

Do NOT show fake queue positions.

Only show queue position if it is calculated from real backend data.

Do NOT generate fake numbers.

====================================================

CHAT SYSTEM

====================================================

Create a real-time, text-only chat system.

Header:

Aisha

Real Person

Friendly conversation

FEATURES:

- Real-time messages

- Message timestamps

- Read status

- Typing indicator when technically genuine

- Conversation history

- Push notification architecture

- Message delivery status

IMPORTANT:

Do NOT fake:

- Typing indicators

- Online status

- Read receipts

- Response times

All states must reflect real backend activity.

====================================================

VERSION 1 CHAT RESTRICTIONS

====================================================

TEXT ONLY.

Do NOT allow:

- Image uploads

- Video uploads

- File uploads

- Voice messages

- Audio calls

- Video calls

- Location sharing

- Contact sharing

Do not automatically extract or expose personal contact information.

====================================================

AISHA FIRST MESSAGE

====================================================

Do NOT automatically create messages pretending that Aisha sent them.

If a welcome message is required before Aisha manually replies:

Clearly label it:

"Hello Aisha Team"

OR:

"Welcome message"

Example:

"Thanks for reaching out. Aisha will reply when she is available."

Do NOT present automated system messages as messages personally written by Aisha.

====================================================

MESSAGE SAFETY

====================================================

Create a server-side moderation architecture.

Messages should have moderation states:

allowed

flagged

blocked

under_review

Detect and flag:

- Severe harassment

- Threats

- Sexual harassment

- Scam attempts

- Spam

- Repeated abusive behavior

- Attempts to share dangerous or exploitative content

IMPORTANT:

Do not over-block normal emotional conversations.

Moderation must not pretend to provide medical diagnosis.

====================================================

USER BLOCKING

====================================================

Users must be able to stop interaction with Aisha if they choose.

Create:

Block Conversation

When blocked:

- The conversation is closed

- Future communication from Aisha is stopped unless the user explicitly re-enables communication where appropriate

Also provide a clear:

Report a Problem

feature.

====================================================

REPORTING

====================================================

Create an accessible in-app reporting system.

Report options:

- Inappropriate behavior

- Harassment

- I feel unsafe

- Privacy concern

- Other

Allow an optional written explanation.

Create a reports database.

Reports must be visible to the admin.

Admin can:

- Review

- Add internal notes

- Mark resolved

- Take appropriate action

====================================================

SAFETY RESOURCES

====================================================

Create a dedicated:

SAFETY RESOURCES

page.

Title:

Your Safety Matters

Text:

"Hello Aisha is not an emergency service."

"If you believe you are in immediate danger or may hurt yourself or someone else, contact local emergency services or seek immediate help from someone you trust."

Provide sections:

- Emergency services

- Talk to someone you trust

- Local support resources

IMPORTANT:

Do NOT:

- Claim that Aisha can handle emergencies

- Claim that Aisha can prevent suicide

- Claim medical treatment

- Diagnose the user

Create the architecture so location-specific resources can be configured later.

====================================================

DAILY CHECK-IN

====================================================

Create a simple optional Daily Check-In.

Title:

How are you feeling today?

Options:

Great

Good

Okay

Low

Having a difficult day

Optional:

"What's on your mind?"

IMPORTANT:

Do NOT:

- Calculate a depression score

- Diagnose mental health conditions

- Present medical conclusions

Clearly present this as a personal reflection feature.

Users can:

- View their own history

- Delete individual check-ins

====================================================

CHATS SCREEN

====================================================

Create:

CHATS

Show only the authenticated user's conversations with Aisha.

Conversation card:

Aisha

Last message preview

Timestamp

Unread indicator

Do not show other users.

====================================================

PROFILE AND SETTINGS

====================================================

Create:

PROFILE

Sections:

ACCOUNT

- Username

- Email

PRIVACY AND SAFETY

- Privacy Policy

- Terms of Service

- Community Guidelines

- Safety Resources

NOTIFICATIONS

- Enable/Disable notifications

ACCOUNT MANAGEMENT

- Delete conversation history

- Request account deletion

====================================================

ACCOUNT DELETION

====================================================

Implement a clear account deletion process.

The option must be easily discoverable.

Example:

Profile

→ Account Management

→ Delete My Account

Before deletion:

Explain:

- What data will be deleted

- Whether any limited data must be retained for legitimate security, fraud prevention, or legal reasons

- Applicable retention period if any

Do not describe account deletion as merely:

Deactivate

Disable

Freeze

Implement a genuine account deletion request flow.

Prepare a separate public web-based account deletion page for users who no longer have the app installed.

====================================================

PRIVACY

====================================================

Collect the minimum data required.

Do NOT collect:

- Exact location unless genuinely necessary

- Contact lists

- SMS

- Call logs

- Photos

- Files

Do not request unnecessary Android permissions.

Use only permissions necessary for actual functionality.

====================================================

NOTIFICATIONS

====================================================

Only send useful notifications.

Examples:

"Aisha replied to your message."

"Your conversation request has been accepted."

Avoid manipulative notifications.

Do NOT send:

"Aisha misses you."

"Aisha is lonely without you."

"Don't leave Aisha."

"You need to come back."

Notifications must not exploit emotional vulnerability.

====================================================

COMMUNITY GUIDELINES

====================================================

Create a clear Community Guidelines page.

Rules:

- Be respectful

- No harassment

- No threats

- No sexual harassment

- No scams

- No impersonation

- Do not share unnecessary private information

- Do not use the service for emergencies

Clearly explain that Hello Aisha may take action against abusive behavior.

====================================================

ADMIN / AISHA DASHBOARD

====================================================

Create a separate secure admin dashboard.

Roles:

user

listener

admin

Initially:

Aisha is both:

listener

and/or

admin depending on implementation.

Normal users must NEVER access:

- Admin dashboard

- Other users' messages

- Internal notes

- Reports

- Moderation information

====================================================

ADMIN DASHBOARD

====================================================

Create:

HELLO AISHA ADMIN

Main statistics:

- New requests

- Waiting conversations

- Active conversations

- Unread messages

- Flagged messages

- Reports

====================================================

ADMIN INBOX

====================================================

Sections:

NEW REQUESTS

WAITING

ACTIVE

CLOSED

FLAGGED

Each conversation shows:

- Username

- Selected topic

- Request time

- Last message

Actions:

ACCEPT

DECLINE

CLOSE

====================================================

ADMIN CHAT

====================================================

Create a professional chat interface.

Aisha can:

- Send messages

- View conversation history

- Close conversations

- Add internal notes

Internal notes:

MUST NEVER be visible to users.

====================================================

USER PROTECTION / ABUSE MANAGEMENT

====================================================

Admin actions:

- Warning

- Temporary mute

- Temporary suspension

- Permanent ban

All actions must be logged.

Create:

moderation_actions

table.

====================================================

DATABASE

====================================================

Use Supabase.

Create these tables:

profiles

user_onboarding

conversations

messages

daily_checkins

reports

moderation_actions

internal_notes

listener_availability

====================================================

PROFILES

====================================================

profiles:

id

username

email

role

created_at

updated_at

account_status

Roles:

user

listener

admin

====================================================

USER ONBOARDING

====================================================

user_onboarding:

id

user_id

selected_reasons

is_adult_confirmed

terms_accepted

peer_support_acknowledged

completed_at

====================================================

CONVERSATIONS

====================================================

conversations:

id

user_id

listener_id

status

topic

requested_at

accepted_at

closed_at

created_at

updated_at

====================================================

MESSAGES

====================================================

messages:

id

conversation_id

sender_id

content

moderation_status

is_read

created_at

====================================================

DAILY CHECKINS

====================================================

daily_checkins:

id

user_id

mood

note

created_at

====================================================

REPORTS

====================================================

reports:

id

reporter_id

conversation_id

reason

description

status

created_at

resolved_at

admin_notes

====================================================

LISTENER AVAILABILITY

====================================================

listener_availability:

id

listener_id

status

updated_at

Statuses:

available

away

not_accepting

====================================================

SUPABASE SECURITY

====================================================

Implement strict Row Level Security.

NORMAL USERS:

Can only:

- View their own profile

- Update their own profile

- View their own conversations

- View messages from their own conversations

- Create messages in their own active conversation

- View and manage their own check-ins

LISTENER:

Can only access:

- Conversations assigned to them

- Messages from assigned conversations

ADMIN:

Can access:

- Reports

- Moderation data

- Required platform management data

IMPORTANT:

Do NOT rely only on frontend authorization.

Enforce authorization with:

- Supabase RLS

- Backend validation

- Secure role checks

Never expose:

- Supabase service role key

- API secrets

- Admin credentials

====================================================

REAL-TIME

====================================================

Use Supabase Realtime for:

- New messages

- Conversation acceptance

- Conversation status changes

- Read status

Only use real data.

Do not simulate activity.

====================================================

RATE LIMITING

====================================================

Implement server-side rate limits.

Prevent:

- Message spam

- Automated abuse

- Excessive repeated messages

If the user exceeds a temporary limit:

Show a respectful message:

"Your messages have been received. Please wait for Aisha to respond."

Do not use punitive or emotionally manipulative language.

====================================================

ERROR HANDLING

====================================================

Create:

- Loading states

- Empty states

- Error states

- Retry buttons

- Offline handling

Do not leave blank screens.

====================================================

ACCESSIBILITY

====================================================

Implement:

- Good color contrast

- Accessible labels

- Readable text

- Large touch targets

- Keyboard support where applicable

====================================================

NO MONETIZATION IN VERSION 1

====================================================

Do NOT implement:

- Subscription

- Payment

- Coins

- Gifts

- Virtual currency

- Paywall

- In-app purchases

The service is free.

Do not advertise misleading promotional claims such as:

"Limited time free"

"Free forever"

unless those claims can genuinely be guaranteed.

====================================================

DO NOT ADD

====================================================

Do NOT add:

- Dating

- Swipe matching

- Random stranger chat

- Anonymous random matching

- User-to-user chat

- Public profiles

- User photo uploads

- Video uploads

- Voice chat

- Video calls

- Location sharing

- Contact sharing

- Payments

- Subscription

====================================================

FUTURE ARCHITECTURE

====================================================

The database must support adding additional real human listeners later.

Example future listeners:

Aisha

Listener 2

Listener 3

But in Version 1:

ONLY AISHA MUST BE DISPLAYED TO USERS.

====================================================

ANALYTICS EVENTS

====================================================

Prepare privacy-conscious analytics events:

onboarding_started

onboarding_completed

signup_completed

conversation_requested

conversation_accepted

first_message_sent

first_human_reply_received

conversation_closed

checkin_completed

report_created

account_deletion_requested

Do not track unnecessary sensitive personal data.

====================================================

FINAL PRODUCT REQUIREMENTS

====================================================

The app must feel:

Human

Warm

Safe

Private

Trustworthy

Simple

The primary user journey:

Install App

↓

Age and Terms Confirmation

↓

Create Account

↓

Understand Aisha is a Real Person

↓

Request Conversation

↓

Wait based on real availability

↓

Aisha Accepts

↓

Real Human Conversation

↓

User Can End Conversation

====================================================

DEVELOPMENT PROCESS

====================================================

Build in this order:

PHASE 1:

Create complete mobile-first UI and navigation.

PHASE 2:

Connect Supabase.

PHASE 3:

Implement authentication.

PHASE 4:

Create database tables.

PHASE 5:

Implement strict Row Level Security.

PHASE 6:

Implement Aisha availability.

PHASE 7:

Implement conversation requests and queue.

PHASE 8:

Implement real-time messaging.

PHASE 9:

Implement admin dashboard.

PHASE 10:

Implement reporting and moderation workflows.

PHASE 11:

Implement account deletion.

PHASE 12:

Test all functionality.

====================================================

FINAL TESTING CHECKLIST

====================================================

Test:

✓ Signup

✓ Login

✓ Age confirmation

✓ Terms acceptance

✓ Username creation

✓ Conversation request

✓ Aisha availability

✓ Conversation acceptance

✓ Real-time chat

✓ Message security

✓ User privacy

✓ Daily check-in

✓ Report feature

✓ Conversation blocking

✓ Admin access control

✓ RLS security

✓ Account deletion request

✓ Mobile responsiveness

✓ Error states

DO NOT leave placeholder buttons.

DO NOT use fake activity.

DO NOT use fake Aisha messages.

DO NOT use mock data after Supabase is connected.

Every feature must use real backend functionality.

Build a production-quality application architecture suitable for future Android packaging and Google Play submission.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://hello-aisha-connect.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9701fbf4-7c52-4519-a49b-b8f2899c07a8).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
