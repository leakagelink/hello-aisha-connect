import { createFileRoute } from "@tanstack/react-router";
import { PageShell, Section } from "@/components/PageShell";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Service — Hello Aisha" },
      {
        name: "description",
        content: "The terms that apply when you use Hello Aisha for friendly conversation.",
      },
      { property: "og:title", content: "Terms of Service — Hello Aisha" },
      { property: "og:description", content: "The terms that apply when you use Hello Aisha." },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <PageShell title="Terms of Service" intro="Please read these terms before using Hello Aisha.">
      <Section heading="What Hello Aisha is">
        <p>
          Hello Aisha provides friendly conversation and peer support with a real person. It is not
          therapy, counselling, medical care, diagnosis, treatment, or an emergency service.
        </p>
        <p>It is not a dating service and does not connect you with random strangers.</p>
      </Section>

      <Section heading="Eligibility">
        <p>You must be 18 years of age or older to create an account and use this service.</p>
      </Section>

      <Section heading="Your account">
        <p>
          You choose a display username. Keep your login details private. You are responsible for
          activity on your account.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>
          You agree to follow the Community Guidelines. We may restrict or end access for behaviour
          that breaks them.
        </p>
      </Section>

      <Section heading="Availability">
        <p>
          Aisha is a person, so she is not available at all times. We do not promise a response
          time.
        </p>
      </Section>

      <Section heading="Cost">
        <p>Hello Aisha is currently offered at no cost. There are no purchases inside the app.</p>
      </Section>

      <Section heading="Ending your account">
        <p>
          You can request account deletion at any time from your profile, or from the public account
          deletion page.
        </p>
      </Section>
    </PageShell>
  );
}
