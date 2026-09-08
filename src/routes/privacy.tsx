import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/PageShell";
import { SUPPORT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy — Hello Aisha" },
      {
        name: "description",
        content: "What Hello Aisha collects, why, and how you can delete your data.",
      },
      { property: "og:title", content: "Privacy Policy — Hello Aisha" },
      { property: "og:description", content: "What Hello Aisha collects and how to delete it." },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <PageShell title="Privacy Policy" intro="We collect the minimum needed to run the service.">
      <Section heading="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your email address, used only for sign-in and account notices</li>
          <li>Your display username</li>
          <li>The optional reasons you selected during onboarding</li>
          <li>Your conversations with Aisha</li>
          <li>Your personal check-ins, if you use that feature</li>
          <li>Reports you submit</li>
        </ul>
      </Section>

      <Section heading="What we never collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your exact location</li>
          <li>Your contact list, SMS messages, or call logs</li>
          <li>Photos, videos, or files</li>
          <li>Your phone number, home address, or legal name</li>
        </ul>
      </Section>

      <Section heading="Who can see your messages">
        <p>
          Only you and Aisha can read your conversation. Your email address is never shown to other
          people using the service.
        </p>
      </Section>

      <Section heading="Safety and moderation">
        <p>
          Messages pass through automated safety checks for threats, harassment, and scams. Flagged
          content may be reviewed by the Hello Aisha team so we can keep people safe.
        </p>
        <p>Moderation is a safety measure. It is not a medical or psychological assessment.</p>
      </Section>

      <Section heading="Analytics">
        <p>
          We record simple product events, such as when a conversation is requested. We do not
          attach the content of your messages to analytics.
        </p>
      </Section>

      <Section heading="Deleting your data">
        <p>
          You can delete your conversation history and request full account deletion from your
          profile. A limited record of safety and abuse-prevention events may be retained where it
          is needed for security, fraud prevention, or legal reasons, normally for up to 12 months.
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
