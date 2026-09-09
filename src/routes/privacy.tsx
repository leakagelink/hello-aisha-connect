import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/PageShell";
import { SUPPORT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Hello Aisha" },
      {
        name: "description",
        content: "What Hello Aisha collects, why, who can see it, and how you can delete your data.",
      },
      { property: "og:title", content: "Privacy Policy — Hello Aisha" },
      { property: "og:description", content: "What Hello Aisha collects and how to delete it." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell
      title="Privacy Policy"
      intro="Hello Aisha is for adults 18 and over. We collect the minimum needed to run the service, and this page explains exactly what that is."
    >
      <Section heading="What we collect and why">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Email address</strong> — used to create your account, sign you in, and send
            account notices. Required.
          </li>
          <li>
            <strong>Password</strong> — stored only in encrypted form by our authentication
            provider. Required.
          </li>
          <li>
            <strong>Display username</strong> — shown inside the service instead of your real name.
            Required.
          </li>
          <li>
            <strong>Onboarding answers</strong> — the reasons you selected, your 18+ confirmation,
            and your acceptance of the terms and peer-support notice. Optional reasons; the
            confirmations are required.
          </li>
          <li>
            <strong>Conversations and messages</strong> — the chats you have with Aisha, including
            message text, timing, read state, and the topic you chose. Required to use the chat.
          </li>
          <li>
            <strong>Check-ins</strong> — the mood and optional note you record. Optional.
          </li>
          <li>
            <strong>Reports</strong> — the reason and description you submit, and the conversation
            it relates to. Optional.
          </li>
          <li>
            <strong>Device notification token</strong> — a code your phone or browser gives us so we
            can deliver notifications. Optional.
          </li>
          <li>
            <strong>Product events</strong> — simple event names such as "conversation requested" or
            "check-in completed", stored with your account id and a timestamp. No message content is
            attached. Required.
          </li>
          <li>
            <strong>Safety and moderation records</strong> — automated flags on messages, actions
            taken by our team (warning, mute, suspension, ban) with a reason, and private internal
            notes written by our team about a conversation. Required.
          </li>
          <li>
            <strong>Account deletion requests</strong> — your account id, email, and the optional
            reason you give, kept while the deletion is processed. Optional.
          </li>
        </ul>
      </Section>

      <Section heading="What we never collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your exact location</li>
          <li>Your contact list, SMS messages, or call logs</li>
          <li>Photos, videos, or files</li>
          <li>Your phone number, home address, or legal name</li>
          <li>Advertising identifiers — the app contains no ads and no advertising trackers</li>
        </ul>
      </Section>

      <Section heading="Who can see your messages">
        <p>
          Your conversation is private between you and Aisha. It is not shown to other people using
          the service, and your email address is never shown to anyone else.
        </p>
        <p>
          Authorised Hello Aisha personnel — Aisha herself and our administrators — can access
          conversation content, reports, and account details when it is necessary for safety,
          moderation, investigating a report, preventing abuse or fraud, operating and supporting
          the service, or complying with the law. Our team can also write private internal notes
          about a conversation. We do not read conversations for advertising or profiling, and we do
          not sell your data.
        </p>
      </Section>

      <Section heading="Notifications and your device token">
        <p>
          If you allow notifications, your device or browser generates a registration token. We
          store that token with your account, together with the platform (Android or web), so we can
          send you a notification when Aisha replies to you or accepts your request.
        </p>
        <p>
          The token identifies a device registration, not you personally, and is never shown in the
          app. It is deleted when you turn alerts off for that device, when the token stops working,
          and when you delete your account. Notification delivery is handled by Google Firebase
          Cloud Messaging, which receives the token and the notification text in order to deliver
          it.
        </p>
      </Section>

      <Section heading="Service providers who process your data">
        <p>
          We use third-party infrastructure to run Hello Aisha. These providers process your data
          only to provide the service to us, under their own security and privacy terms:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Our cloud database, authentication and hosting provider</strong> — stores your
            account, profile, conversations, messages, check-ins, reports and product events, and
            runs the app itself.
          </li>
          <li>
            <strong>Google Firebase Cloud Messaging</strong> — delivers push notifications to your
            device.
          </li>
        </ul>
        <p>
          We do not sell your personal data and we do not share it with advertisers or data brokers.
          We may disclose data where the law requires it or to protect someone's safety.
        </p>
      </Section>

      <Section heading="Safety and moderation">
        <p>
          Messages pass through automated safety checks for threats, harassment, and scams. Flagged
          content may be reviewed by authorised Hello Aisha personnel so we can keep people safe.
        </p>
        <p>Moderation is a safety measure. It is not a medical or psychological assessment.</p>
      </Section>

      <Section heading="How long we keep your data">
        <p>
          We keep your account data while your account exists. Conversations remain until you delete
          your history or your account. Coded safety records described below expire automatically
          after 12 months.
        </p>
      </Section>

      <Section heading="Deleting your data">
        <p>
          You can delete your conversation history and delete your account from your profile inside
          the app, or from the public account deletion page at helloaisha.online/delete-account
          without installing the app. Account deletion is permanent and immediate: your profile,
          username, email, conversations, messages, check-ins, onboarding answers, reports, product
          events, device notification tokens, internal notes about your conversations, and your
          sign-in credentials are erased.
        </p>
        <p>
          Where a report or safety action involved your account, we keep only a coded internal
          reference to that event — a one-way pseudonymous code, the type of event, and a short
          reason. It contains no email address, no profile details and no conversation content, is
          automatically erased after 12 months, and is used only for security, fraud prevention, or
          legal reasons.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          Hello Aisha is intended only for adults aged 18 and over. We do not knowingly collect data
          from anyone under 18. If we learn that an account belongs to a minor, we close it and
          delete the data.
        </p>
      </Section>

      <Section heading="Not a medical or emergency service">
        <p>
          Hello Aisha provides friendly conversation and peer support. It is not therapy,
          counselling, medical care, diagnosis or treatment, it is not a substitute for professional
          medical or mental-health care, and it is not an emergency service. Nothing you write here
          is treated as a medical record.
        </p>
      </Section>

      <Section heading="Contact us">
        <p>
          You can write to us at{" "}
          <a className="font-semibold underline" href={`mailto:${SUPPORT_EMAIL}`}>
            {SUPPORT_EMAIL}
          </a>
          . This inbox is not monitored for emergencies.
        </p>
      </Section>
    </PageShell>
  );
}
