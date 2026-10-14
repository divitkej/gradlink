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
          <li><strong>Account details:</strong> your name, email address, account type (student, company, college or alumni mentor) and organisation, and whether you have confirmed your email address. Your password is stored only as a one-way hash; we cannot read it.</li>
          <li><strong>Student profile:</strong> university, degree, graduation year, skills, bio, career goal, target roles, projects, links to LinkedIn, GitHub and a portfolio, and your résumé file.</li>
          <li><strong>Achievements you choose to add:</strong> LeetCode and Codeforces usernames and the stats those sites show for them, Coursera certificates (course, issuer, completion date and skills), Credly badges, and other certificates with their links.</li>
          <li><strong>Scores we work out:</strong> a résumé score, a career readiness score with its competencies, and an engagement score for each event.</li>
          <li><strong>Company profile:</strong> company name, sector, website, description, roles you are hiring for, skills wanted, booth number, logo and brochure.</li>
          <li><strong>Alumni mentor profile:</strong> the year you graduated, your degree, current role and company, LinkedIn link and what you can help with.</li>
          <li><strong>College details:</strong> your institution, an example of your students’ email address (so their domain can be approved for sign-up) and the plan you chose.</li>
          <li><strong>Event activity:</strong> events you create or join, check-ins, QR scans between students and companies with any notes added, shortlist decisions and notes, sessions you book, booth queues you join, companies you save or mark as interesting, interview invites, offers a company records, notifications, and per-event counts such as profile views and scans received.</li>
          <li><strong>Applications you track:</strong> the companies and roles you applied to, their status, interview dates and your notes.</li>
          <li><strong>Messages</strong> you send and receive on GradLink.</li>
          <li><strong>Files</strong> you upload (résumés, brochures, logos, photos, up to 10 MB each).</li>
          <li><strong>Billing details</strong> for colleges on Placement Pro: your plan, its status and renewal date, and the customer and subscription references Stripe gives us. Card details go straight to Stripe and never reach us.</li>
          <li><strong>Security and technical data:</strong> failed sign-in counts used to lock out password guessing, request counters kept against a one-way hash of your IP address to limit abuse, error messages from our server, and standard request logs kept by our host Cloudflare (such as IP address, browser type and the page requested).</li>
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
          <li>To calculate your résumé, readiness and engagement scores. They are worked out automatically from fixed rules about your profile and event activity. They are guidance only and do not decide anything about you by themselves.</li>
          <li>To check that a coding profile, course certificate or badge you add is real and yours, by looking it up on the site that issued it.</li>
          <li>To keep GradLink secure, for example locking an account after repeated wrong passwords.</li>
          <li>To send account emails, such as a link to confirm your email address or reset your password, once email sending is switched on. We will name the service that sends them in this policy before it starts.</li>
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
        <p>GradLink exists to connect students with employers and colleges, so much of what you add is shared, but only with people at the same events as you:</p>
        <ul>
          <li>
            <strong>Companies at your event</strong> see a student’s profile, résumé, links and the achievements the student chooses to show.
            They see a student’s email only after scanning that student’s QR code. They never see a student’s scores.
          </li>
          <li><strong>The college running your event</strong> sees the profiles, scores, scans, shortlists and activity of the people at that event.</li>
          <li><strong>Alumni mentors at your event</strong> see students as other students do: name, university, degree, graduation year, skills and bio, without contact details or scores. Students and the college at a mentor’s events see the mentor’s profile, never their email; the college that invited them also sees their email.</li>
          <li><strong>Other students at your event</strong> see your name, university, degree, graduation year, skills and bio, without contact details, and the top five on the engagement leaderboard by first name and last initial.</li>
          <li>
            <strong>Visible only to the people involved:</strong> messages (the sender and the recipient), a scan (the two people in it), interview
            invites (the student and the company), and a student marking a company Interested or asking it for a follow-up (that student and that company).
            A company’s shortlist decisions and notes are seen by that company and the event’s college; a student only sees which companies shortlisted them.
            An offer a company records is seen by that student, that company and the event’s college, which counts it in the event’s results.
          </li>
          <li><strong>Visible only to you:</strong> your checklist progress, your application tracker, companies you saved or marked visited and your notes on them, and your billing details.</li>
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
          <li>
            <strong>LeetCode, Codeforces, Coursera and Credly</strong>: when you add a coding profile, certificate or badge, our server looks it
            up on that site to check it. We send only the username, certificate code or badge id you entered.
          </li>
        </ul>
        <p>Each one only handles your data to provide its service to us. We may also share data if the law requires it, or with a buyer if GradLink is ever sold, in which case this policy continues to apply.</p>
      </>
    ),
  },
  {
    heading: "Data stored outside the UAE",
    body: (
      <p>
        Your data is stored and processed outside the UAE, mainly in Singapore, and wherever Cloudflare and Stripe operate. The lookups
        described above go to the servers of the site being checked.
        We use these providers because they apply strong security and data protection commitments to the data they hold.
      </p>
    ),
  },
  {
    heading: "How long we keep it",
    body: (
      <ul>
        <li>Account and profile data: for as long as your account is open. When you ask us to delete your account, we delete it within 30 days.</li>
        <li>Email confirmation links: they expire after 24 hours. Password reset links: after 60 minutes.</li>
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
        Your browser’s local storage also keeps a copy of your account id, name, organisation, account type and the event you have
        open, so pages load quickly (removed when you sign out), and your checklist ticks. We do not use advertising or analytics
        cookies.
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
      updated="14 October 2026"
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
