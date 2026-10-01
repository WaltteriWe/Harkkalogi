import ReportButton from "./components/reportButton";
import ReportingProgress, { type Step } from "./components/reportingProgress";
import Sidebar from "./components/sidebar";
import Link from "next/link";

// Placeholder data until real data is wired in
const hoursLogged = 0;
const hoursTotal = 800;

const contacts = [
  { name: "Laura Nieminen", role: "Workplace supervisor" },
  { name: "Mikko Laine", role: "Supervising teacher" },
];

const activity = [
  { text: "Teacher approved your internship agreement", date: "28.5.2026" },
  { text: 'You uploaded "Harjoittelusopimus.pdf"', date: "24.5.2026" },
];

export default function Home() {
  return (
    <div className="app-shell">
      <Sidebar role="student" userName="Aino Korhonen" />

      <main className="main flex flex-col gap-6">
        <header className="flex items-start justify-between gap-4">
          <div>
            <h1>My internship</h1>
            <p className="meta mt-2 text-base">
              Practical training · Frontend developer at Nordic Pixel Oy ·
              1.6.–30.11.2026
            </p>
          </div>
          <ReportButton />
        </header>

        <ReportingProgress steps={steps} />

        <div className="grid gap-6 md:grid-cols-3">
          <section className="card">
            <p className="label">Next step</p>
            <h2 className="mt-2">Submit your final report</h2>
            <p className="meta mt-2 text-base">
              Include your tasks, what you learned and the supervisor&apos;s
              work certificate.
            </p>
            <Link href="/reporting" className="link mt-4 inline-block">
              Start report →
            </Link>
          </section>

          <section className="card">
            <p className="label">Hours logged</p>
            <p className="mt-2">
              <span className="tabular text-4xl">{hoursLogged}</span>{" "}
              <span className="meta tabular text-base">/ {hoursTotal} h</span>
            </p>
            <div
              className="progress-track mt-3"
              role="progressbar"
              aria-valuenow={hoursLogged}
              aria-valuemax={hoursTotal}
              aria-label="Hours logged"
            >
              <div
                className="progress-bar"
                style={{ width: `${(hoursLogged / hoursTotal) * 100}%` }}
              />
            </div>
            <p className="meta mt-3 text-base">
              {hoursTotal - hoursLogged} h remaining
            </p>
          </section>

          <section className="card">
            <p className="label">Contacts</p>
            <ul className="mt-2 flex flex-col gap-3">
              {contacts.map(({ name, role }) => (
                <li key={name}>
                  <p className="font-semibold">{name}</p>
                  <p className="meta text-base">{role}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="card">
          <h2>Recent activity</h2>
          <ul className="mt-3">
            {activity.map(({ text, date }) => (
              <li
                key={text}
                className="flex justify-between gap-4 border-t border-border py-3 first:border-t-0"
              >
                <span>{text}</span>
                <span className="meta shrink-0">{date}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}
