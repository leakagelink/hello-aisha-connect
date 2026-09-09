import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/PageShell";
import { SUPPORT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/guidelines")({
  head: () => ({
    meta: [
      { title: "Community Guidelines — Hello Aisha" },
      {
        name: "description",
        content: "The rules that keep Hello Aisha a respectful, safe place to talk.",
      },
      { property: "og:title", content: "Community Guidelines — Hello Aisha" },
      { property: "og:description", content: "How we keep Hello Aisha respectful and safe." },
    ],
  }),
  component: GuidelinesPage,
});

function GuidelinesPage() {
  return (
    <PageShell
      title="Community Guidelines"
      intro="Hello Aisha is a calm, respectful space for adults. These rules apply to everyone."
    >
      <Section heading="Please do">
        <ul className="list-disc space-y-1 pl-5">
          <li>Be respectful and considerate</li>
          <li>Speak honestly about how you feel</li>
          <li>Give the other person space and time to reply</li>
        </ul>
      </Section>

      <Section heading="Please don't">
        <ul className="list-disc space-y-1 pl-5">
          <li>Harass, insult, or intimidate anyone</li>
          <li>Make threats of any kind</li>
          <li>Send sexual harassment or unwanted sexual content</li>
          <li>Run scams, solicit money, or advertise</li>
          <li>Impersonate another person</li>
          <li>Share private information that isn't needed for the conversation</li>
          <li>Use this service for emergencies</li>
        </ul>
      </Section>

      <Section heading="Prohibited content">
        <p>
          Sexual content involving minors, threats of violence, hate speech, self-harm
          encouragement, sexual solicitation, scams, and spam are never allowed and may be reported
          to the authorities.
        </p>
        <p>Hello Aisha is for adults aged 18 and over only.</p>
      </Section>

      <Section heading="Enforcement">
        <p>
          Hello Aisha may take action against abusive behaviour. Depending on what happened, that
          can mean a warning, a temporary mute, a temporary suspension, or a permanent ban.
        </p>
        <p>Every action taken by our team is recorded internally.</p>
      </Section>

      <Section heading="Reporting and blocking">
        <p>
          You can report a problem from inside any conversation, or from your profile. You can also
          block a conversation at any time, which closes it immediately. Reports are reviewed by
          authorised Hello Aisha personnel, who may read the reported conversation in order to act
          on it.
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
