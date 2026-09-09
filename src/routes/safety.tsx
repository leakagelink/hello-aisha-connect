import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/PageShell";
import { SUPPORT_EMAIL } from "@/lib/site";

export const Route = createFileRoute("/safety")({
  head: () => ({
    meta: [
      { title: "Safety Resources — Hello Aisha" },
      {
        name: "description",
        content:
          "Hello Aisha is not an emergency service. Find emergency guidance and local support options here.",
      },
      { property: "og:title", content: "Safety Resources — Hello Aisha" },
      { property: "og:description", content: "Hello Aisha is not an emergency service." },
    ],
  }),
  component: SafetyPage,
});

function SafetyPage() {
  return (
    <PageShell
      title="Your Safety Matters"
      intro="Hello Aisha is not an emergency service."
    >
      <Section heading="If you need immediate help">
        <p>
          If you believe you are in immediate danger or may hurt yourself or someone else, contact
          local emergency services or seek immediate help from someone you trust.
        </p>
        <p>
          Aisha is a person who listens. She cannot provide medical care, therapy, crisis
          intervention, or emergency response, and Hello Aisha is not a substitute for professional
          medical or mental-health care.
        </p>
      </Section>


      <Section heading="Emergency services">
        <p>
          Dial your country's emergency number. In many countries this is 112, 911, 999, or 000. If
          you are unsure, contact your local police or ambulance service.
        </p>
        <p>
          Region-specific numbers can be configured for your location in a future update of this
          page.
        </p>
      </Section>

      <Section heading="Talk to someone you trust">
        <p>
          A family member, friend, colleague, teacher, or community member can stay with you and
          help you reach support.
        </p>
        <p>Telling one person is often the fastest first step.</p>
      </Section>

      <Section heading="Local support resources">
        <p>
          Local helplines and support organisations differ by country and region. Search for
          services in your area, or ask a trusted person to help you find them.
        </p>
      </Section>

      <Section heading="Staying safe on Hello Aisha">
        <p>Never share your address, financial details, passwords, or identity documents.</p>
        <p>
          Use Report a Problem inside any conversation if something makes you uncomfortable. You can
          also block the conversation at any time.
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
