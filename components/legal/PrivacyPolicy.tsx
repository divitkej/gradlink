import LegalPage, { type LegalSection } from "./LegalPage";
import { OPERATOR } from "@/lib/site";

// Written from what the app actually stores (db/schema.sql), who can read it
// (lib/server/rpc.ts, lib/server/files.ts) and which services it uses.
// Update this page in the same change as anything that alters those.

const mail = <a href={`mailto:${OPERATOR.email}`}>{OPERATOR.email}</a>;

const sections: LegalSection[] = [
  {
    heading: "Who runs GradLink",
    body: (
      <>
        <p>
          GradLink is run by <strong>{OPERATOR.name}</strong>, an individual based in {OPERATOR.location}. GradLink is not yet a
          registered company. Until it is, {OPERATOR.name} is responsible for your personal data under this policy (the “controller”).
        </p>
        <p>For anything about your data, email {mail}.</p>
      </>
    ),
  },
  {
    heading: "What we collect",
    body: (
      <>
        <p>We only collect what you give us or what GradLink needs to work:</p>
        <ul>
          <li><strong>Account details:</strong> your name, email address, account type (student, company or college) and organisation. Your password is stored only as a one-way hash; we cannot read it.</li>
          <li><strong>Student profile:</strong> university, degree, graduation year, skills, bio, links to LinkedIn, GitHub and a portfolio, your résumé file and a résumé score.</li>
          <li><strong>Company profile:</strong> company name, sector, website, description, roles you are hiring for, skills wanted, booth number, logo and brochure.</li>
          <li><strong>Event activity:</strong> events you create or join, check-ins, QR scans between students and companies with any notes added, shortlist decisions and notes, and per-event counts such as profile views and scans received.</li>
          <li><strong>Messages</strong> you send and receive on GradLink.</li>
          <li><strong>Files</strong> you upload (résumés, brochures, logos, photos, up to 10 MB each).</li>
          <li><strong>Billing details</strong> for colleges on Placement Pro: your plan, its status and renewal date, and the customer and subscription references Stripe gives us. Card details go straight to Stripe and never reach us.</li>
          <li><strong>Security and technical data:</strong> failed sign-in counts used to lock out password guessing, and standard request logs kept by our host Cloudflare (such as IP address, browser type and the page requested).</li>
        </ul>
      </>
    ),
  },
  {
    heading: "How we use it",
    body: (
      <>
        <ul>
          <li>To run your account and the features you use: profiles, events, scanning, shortlists, messages and reports.</li>
          <li>To calculate your résumé score. It is worked out automatically from fixed rules about how complete your profile is. It is guidance only and does not decide anything about you by itself.</li>
          <li>To keep GradLink secure, for example locking an account after repeated wrong passwords.</li>
          <li>To send emails you ask for, such as password reset links.</li>
          <li>To take payment for Placement Pro and keep records the law requires.</li>
          <li>To answer you when you contact us.</li>
        </ul>
        <p>
          We use your data because it is needed to provide the service you signed up for, to meet legal duties, or for our
          legitimate interest in keeping GradLink safe. We do not sell your data, show ads, or use analytics or tracking tools.
        </p>
      </>
    ),
  },
  {
    heading: "Who can see your information",
    body: (
      <>
        <p>GradLink exists to connect students with employers and colleges, so most of what you add is shared with other people who use it:</p>
        <ul>
          <li>
            <strong>Visible to other signed-in GradLink users:</strong> profiles (including a student’s résumé and links), company
            profiles, events and who is registered for them, scans, shortlist statuses and the notes attached to them.
          </li>
          <li><strong>Visible only to the people involved:</strong> messages (the sender and the recipient).</li>
          <li><strong>Visible only to you:</strong> your checklist progress, your list of joined events and your billing details.</li>
        </ul>
        <p>Nothing is visible to people who are not signed in, and we do not publish your profile to search engines.</p>
      </>
    ),
  },
  {
    heading: "Services that process data for us",
    body: (
      <>
        <ul>
          <li><strong>Neon</strong> stores the GradLink database, in Singapore.</li>
          <li><strong>Cloudflare</strong> hosts the website, stores uploaded files and keeps request logs, on its global network.</li>
          <li><strong>Stripe</strong> handles Placement Pro payments.</li>
          <li><strong>Resend</strong> sends password reset emails, once that feature is switched on.</li>
        </ul>
        <p>Each one only handles your data to provide its service to us. We may also share data if the law requires it, or with a buyer if GradLink is ever sold, in which case this policy continues to apply.</p>
      </>
    ),
  },
  {
    heading: "Data stored outside the UAE",
    body: (
      <p>
        Your data is stored and processed outside the UAE, mainly in Singapore, and wherever Cloudflare and Stripe operate.
        We use these providers because they apply strong security and data protection commitments to the data they hold.
      </p>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <ul>
        <li>Account and profile data: for as long as your account is open. When you ask us to delete your account, we delete it within 30 days.</li>
        <li>Password reset links: they expire after 60 minutes.</li>
        <li>Sign-in cookie: up to 30 days, or until you sign out.</li>
        <li>Billing records: as long as UAE law requires us to keep them.</li>
        <li>Request logs: for as long as Cloudflare’s standard log retention.</li>
      </ul>
    ),
  },
  {
    heading: "Your rights",
    body: (
      <>
        <p>Under the UAE Personal Data Protection Law (Federal Decree-Law No. 45 of 2021), and other laws that may apply to you, you can ask us to:</p>
        <ul>
          <li>give you a copy of the data we hold about you,</li>
          <li>correct data that is wrong (you can also edit most of it yourself in your profile),</li>
          <li>delete your account and data,</li>
          <li>stop or limit how we use your data,</li>
          <li>send your data to you in a portable format.</li>
        </ul>
        <p>
          Email {mail} from the address on your account. We will reply within 30 days. If you are unhappy with our answer, you can
          complain to the UAE Data Office.
        </p>
      </>
    ),
  },
  {
    heading: "Security",
    body: (
      <p>
        Passwords are hashed, all traffic uses HTTPS, you stay signed in through a signed cookie that scripts cannot read, and
        every request is checked on our server before any data is read or changed. No system is perfectly secure. If a breach
        puts your data at risk, we will tell you and the authorities as the law requires.
      </p>
    ),
  },
  {
    heading: "Cookies and browser storage",
    body: (
      <p>
        GradLink sets one cookie, which keeps you signed in. It is needed for the site to work, so there is no cookie banner.
        We also save your checklist ticks in your browser’s local storage so they load quickly. We do not use advertising or
        analytics cookies.
      </p>
    ),
  },
  {
    heading: "Age",
    body: (
      <p>
        GradLink is built for university students, employers and colleges. If you are under 18, you need a parent or
        guardian’s permission to use it. If you believe someone under 18 has given us data without that permission, email {mail} and we will delete it.
      </p>
    ),
  },
  {
    heading: "Changes to this policy",
    body: (
      <p>
        When we change this policy we will update the date at the top. If a change affects how your data is used in a
        significant way, we will tell you by email or on GradLink before it takes effect.
      </p>
    ),
  },
  {
    heading: "Contact",
    body: <p>Questions or requests about your data: {mail}.</p>,
  },
];

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="27 September 2026"
      intro={
        <p>
          This policy explains what personal data GradLink collects, why, who can see it and the choices you have. It applies
          to the GradLink website and app.
        </p>
      }
      sections={sections}
    />
  );
}
