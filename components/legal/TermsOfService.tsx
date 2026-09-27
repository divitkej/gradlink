import LegalPage, { type LegalSection } from "./LegalPage";
import { OPERATOR } from "@/lib/site";

// Plan names and prices must match PLANS in lib/billing.ts.

const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;

const sections: LegalSection[] = [
  {
    heading: "Who you are agreeing with",
    body: (
      <p>
        GradLink is run by <strong>{OPERATOR.name}</strong>, an individual based in {OPERATOR.location} (“we” or
        “us”). GradLink is not yet a registered company. By creating an account or using GradLink, you agree to these
        terms and to our <a href="/privacy">Privacy Policy</a>. If you use GradLink for an organisation, you confirm you are
        allowed to accept these terms for it.
      </p>
    ),
  },
  {
    heading: "Who can use GradLink",
    body: (
      <>
        <p>GradLink has three kinds of account:</p>
        <ul>
          <li><strong>Students</strong> build a career profile, join events and connect with employers.</li>
          <li><strong>Companies</strong> join events, scan and shortlist students and message them.</li>
          <li><strong>Colleges</strong> create and run events and see their outcomes.</li>
        </ul>
        <p>You must be 18 or older, or have a parent or guardian’s permission, to use GradLink.</p>
      </>
    ),
  },
  {
    heading: "Your account",
    body: (
      <ul>
        <li>Give accurate information and keep it up to date.</li>
        <li>Keep your password private. You are responsible for what happens under your account.</li>
        <li>One person per account. Do not share it or create accounts for other people without their permission.</li>
        <li>Tell us at {mail} straight away if you think someone else has used your account.</li>
      </ul>
    ),
  },
  {
    heading: "Your content",
    body: (
      <p>
        You own what you add to GradLink, such as your profile, résumé, notes and messages. You give us permission to store,
        display and process it only as needed to run GradLink, including showing it to other users as described in the
        Privacy Policy. You confirm you have the right to share it and that it does not break anyone else’s rights or the law.
      </p>
    ),
  },
  {
    heading: "Rules for using GradLink",
    body: (
      <>
        <p>You must not:</p>
        <ul>
          <li>give false information, pretend to be someone else, or post fake job opportunities,</li>
          <li>harass, threaten or discriminate against anyone, or send spam,</li>
          <li>upload anything unlawful, offensive, or containing viruses or harmful code,</li>
          <li>copy, scrape or collect other users’ data by automated means,</li>
          <li>try to get around security, access accounts or data that are not yours, or overload the service,</li>
          <li>use GradLink in a way that breaks UAE law or the law where you are.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "Extra rules for companies and colleges",
    body: (
      <p>
        Student information on GradLink may only be used for recruitment and career services connected to GradLink events. You
        must not sell it, share it with anyone outside your organisation, or use it for marketing. You are responsible for
        following employment and data protection law when you contact, assess or hire students.
      </p>
    ),
  },
  {
    heading: "Plans and payment",
    body: (
      <>
        <ul>
          <li><strong>Starter</strong> is free, for students, companies and colleges.</li>
          <li>
            <strong>Placement Pro</strong> is a plan for colleges, priced at <strong>AED 3,600 per campus per year</strong>, paid
            in advance through Stripe. It renews automatically each year until cancelled.
          </li>
          <li>To cancel, email {mail} before your renewal date. You keep Placement Pro until the end of the year you have paid for.</li>
          <li>Fees already paid are not refunded, except where the law requires it or where we close GradLink or your account without you breaking these terms, in which case we refund the unused part.</li>
          <li>If we change the price, we will tell you at least 30 days before your next renewal.</li>
        </ul>
      </>
    ),
  },
  {
    heading: "What GradLink does today",
    body: (
      <p>
        GradLink is new and still growing. Some screens on our website show sample data and features that are still being
        built; they are labelled as a product preview. What each plan includes today is listed on the{" "}
        <a href="/pricing">pricing page</a>. The résumé score is automatic guidance, not professional career advice, and we do
        not guarantee any interview, job or hiring outcome.
      </p>
    ),
  },
  {
    heading: "Availability and changes",
    body: (
      <p>
        We work to keep GradLink running, but it is provided “as is” and may sometimes be unavailable, for example during
        maintenance or problems with our hosting providers. We may improve, change or remove features. If we plan to shut
        GradLink down, we will give you at least 30 days’ notice so you can ask for a copy of your data.
      </p>
    ),
  },
  {
    heading: "Closing an account",
    body: (
      <p>
        You can close your account at any time by emailing {mail}. We may suspend or close an account that breaks these terms or
        puts other users at risk. Where it is reasonable, we will tell you why first and give you a chance to fix it.
      </p>
    ),
  },
  {
    heading: "Limits on our liability",
    body: (
      <p>
        As far as the law allows, we are not liable for indirect losses such as lost profits, lost opportunities or lost data,
        or for what other users do or say on GradLink. Our total liability to you for any claim is limited to the amount you
        paid us in the 12 months before the claim, or AED 500 if that is higher. Nothing in these terms limits liability that
        cannot be limited under UAE law.
      </p>
    ),
  },
  {
    heading: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of the United Arab Emirates as applied in the Emirate of Dubai. Any dispute will go
        to the courts of Dubai. Before that, please email us so we can try to sort it out directly.
      </p>
    ),
  },
  {
    heading: "Changes to these terms",
    body: (
      <p>
        We may update these terms as GradLink grows. We will change the date at the top and, for significant changes, tell you by
        email or on GradLink at least 14 days before they take effect. If you keep using GradLink after that, the new terms apply.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: <p>Questions about these terms: {mail}.</p>,
  },
];

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms and Conditions"
      updated="27 September 2026"
      intro={<p>These terms set out the rules for using GradLink and what you can expect from us. Please read them before you sign up.</p>}
      sections={sections}
    />
  );
}
