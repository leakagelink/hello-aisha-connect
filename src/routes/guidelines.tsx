import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/PageShell";

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

      <Section heading="Enforcement">
        <p>
          Hello Aisha may take action against abusive behaviour. Depending on what happened, that
          can mean a warning, a temporary mute, a temporary suspension, or a permanent ban.
        </p>
        <p>Every action taken by our team is recorded internally.</p>
      </Section>

      <Section heading="Reporting">
        <p>
          You can report a problem from inside any conversation, or from your profile. Reports are
          reviewed by the Hello Aisha team.
        </p>
      </Section>
    </PageShell>
  );
}
