"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useReport } from "@/context/ReportContext";
import { useInternship } from "@/context/InternshipContext";
import { registerDraftFlusher } from "@/lib/draft-registry";
import LockedNoticeCard from "@/components/lockedNoticeCard";
import {
  CheckboxGroup,
  type CheckboxItem,
} from "@/components/checkboxGroup";
import {
  StarEvaluationGroup,
  isEvaluationGroupComplete,
  type StarEvaluationSubject,
} from "@/components/starRating";

/**
 * Checklist topics matching Finnish UAS internship guidance evaluation practice.
 */
const ASIAT_TARKEMMIN_ITEMS: CheckboxItem[] = [
  {
    id: "perehdytys",
    label: "Perehdytys ja työyhteisön käytännöt",
    description:
      "Työvälineet, järjestelmät, talon tavat ja työturvallisuusohjeistus",
  },
  {
    id: "tavoitteet",
    label: "Tavoitteiden selkeys ja harjoittelusuunnitelman seuranta",
    description:
      "Omien oppimistavoitteiden seuraaminen ja tarvittavat tarkistukset suuntaan",
  },
  {
    id: "palaute",
    label: "Säännöllisen palautteen saaminen työsuorituksista",
    description:
      "Konstruktiivinen ja oikea-aikainen palaute omasta työstä ja kehittymiskohteista",
  },
  {
    id: "ohjausaika",
    label: "Työpaikkaohjaajan tavoitettavuus ja riittävä ohjausaika",
    description:
      "Kysymyksiin vastaaminen, arjen tuki ja säännölliset ohjauskeskustelut",
  },
  {
    id: "opettaja",
    label: "Yhteydenpito ja välikatsaukset ohjaavan opettajan kanssa",
    description:
      "Oppilaitoksen tuki ja harjoittelun suoritusvaatimusten varmistaminen",
  },
  {
    id: "jaksaminen",
    label: "Työmäärän mitoitus, työajat ja jaksaminen",
    description:
      "Työkuorman tasapaino ja realistiset odotukset opiskelijan osaamistasoon nähden",
  },
];

/**
 * Star evaluation subjects/criteria for guidance quality.
 */
/**
 * Group 1: Työpaikan ohjaus ja työyhteisö (Workplace supervision & community)
 */
export const TYOPAIKKA_OHJAUS_SUBJECTS: StarEvaluationSubject[] = [
  {
    id: "tyopaikkaohjaus",
    subject: "Työpaikkaohjaajan antama tuki ja ohjaus",
    description: "Ohjaajan tavoitettavuus, perehdytys ja palautteen laatu työn arjessa",
    minLabel: "1 = Heikko",
    maxLabel: "5 = Erinomainen",
    labels: ["Heikko", "Välttävä", "Kohtalainen", "Hyvä", "Erinomainen"],
  },
  {
    id: "tehtavat_vastaavuus",
    subject: "Työtehtävien vastaavuus harjoittelusuunnitelmaan",
    description: "Tehtävien monipuolisuus, ammatillinen haastavuus ja soveltuvuus opintoihin",
    minLabel: "1 = Ei vastannut",
    maxLabel: "5 = Vastasi täysin",
    labels: ["Ei vastannut", "Heikosti", "Kohtalaisesti", "Hyvin", "Vastasi täysin"],
  },
  {
    id: "tyoyhteiso",
    subject: "Työyhteisön ilmapiiri ja opiskelijan vastaanotto",
    description: "Ystävällinen ja tasavertainen vastaanotto tiimin toimintaan",
    minLabel: "1 = Huono",
    maxLabel: "5 = Erinomainen",
    labels: ["Huono", "Välttävä", "Tyydyttävä", "Hyvä", "Erinomainen"],
  },
];

/**
 * Group 2: Oppilaitoksen tuki ja harjoittelun kokonaisarviointi (Academic guidance & overall evaluation)
 */
export const OPPILAITOS_OHJAUS_SUBJECTS: StarEvaluationSubject[] = [
  {
    id: "oppilaitos_ohjaus",
    subject: "Oppilaitoksen ja ohjaavan opettajan ohjaus",
    description: "Ohjeistuksen selkeys, asioiden hoitaminen ja ohjaajan tavoitettavuus",
    minLabel: "1 = Riittämätön",
    maxLabel: "5 = Erinomainen",
    labels: ["Riittämätön", "Välttävä", "Kohtalainen", "Hyvä", "Erinomainen"],
  },
  {
    id: "kokonaisarvio",
    subject: "Harjoittelujakson kokonaisarvosana",
    description: "Oma kokemuksesi harjoittelujaksosta ja sen hyödystä ammatilliselle kasvullesi",
    minLabel: "1 = Välttävä",
    maxLabel: "5 = Kiitettävä",
    labels: ["Välttävä", "Tyydyttävä", "Hyvä", "Kiitettävä", "Erinomainen"],
  },
];

export const OHJAUS_ARVIOINTI_SUBJECTS: StarEvaluationSubject[] = [
  ...TYOPAIKKA_OHJAUS_SUBJECTS,
  ...OPPILAITOS_OHJAUS_SUBJECTS,
];

const TEACHER_SAMPLE_RATINGS: Record<string, number> = {
  tyopaikkaohjaus: 4,
  tehtavat_vastaavuus: 5,
  tyoyhteiso: 5,
  oppilaitos_ohjaus: 4,
  kokonaisarvio: 5,
};

function ChecklistIcon({ done }: { done: boolean }) {
  return done ? (
    <span className="step-icon-done shrink-0" aria-label="Completed">
      <svg
        className="size-3.5 stroke-white"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </span>
  ) : (
    <span className="step-icon-todo shrink-0" aria-label="To do" />
  );
}

export default function GuidanceEvaluationPage() {
  const { user } = useAuth();
  const { report } = useReport();
  const { isEvaluationLocked: isWorkflowLocked } = useInternship();
  const isTeacher = user?.role === "teacher";
  const leaveHref = isTeacher ? "/teacher-view" : "/";
  const leaveLabel = isTeacher ? "← Back to teacher view" : "← Back to overview";

  const isActualReportApproved = report?.status === "approved";
  // Interactive test toggle: allows switching between "Lomake auki (ON)" and "Esikatselu (OFF)" during testing
  const [testUnlockedOverride, setTestUnlockedOverride] = useState<boolean | null>(null);

  const isReportApproved =
    testUnlockedOverride !== null ? testUnlockedOverride : isActualReportApproved;
  const isLocked = isTeacher ? false : !isReportApproved;

  // Local state for dynamic checklist items
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([
    "tavoitteet",
    "palaute",
  ]);

  // Local state for dynamic star evaluations (subjectId -> rating)
  const [studentRatings, setStudentRatings] = useState<Record<string, number>>({
    tyopaikkaohjaus: 0,
    tehtavat_vastaavuus: 0,
    tyoyhteiso: 0,
    oppilaitos_ohjaus: 0,
    kokonaisarvio: 0,
  });

  const starRatings = isTeacher ? TEACHER_SAMPLE_RATINGS : studentRatings;

  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const handleRatingChange = (subjectId: string, rating: number) => {
    if (isTeacher || isLocked) return;
    setStudentRatings((prev) => ({
      ...prev,
      [subjectId]: rating,
    }));
  };

  const handleSaveDraft = () => {
    if (isLocked) return;
    setSavedFeedback("Arviointiluonnos tallennettu onnistuneesti!");
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  // Register flusher for pre-logout draft sync / persistence
  useEffect(() => {
    if (isLocked || isTeacher) return;
    return registerDraftFlusher(async (): Promise<boolean> => {
      // Future backend sync: POST /internships/:id/guidance-evaluation { ratings: studentRatings, topics: selectedCheckboxes, status: 'DRAFT' }
      return true;
    });
  }, [isLocked, isTeacher, studentRatings, selectedCheckboxes]);

  // Checklist completion states
  const isWorkplaceComplete = useMemo(
    () => isEvaluationGroupComplete(TYOPAIKKA_OHJAUS_SUBJECTS, starRatings),
    [starRatings]
  );
  const isInstitutionComplete = useMemo(
    () => isEvaluationGroupComplete(OPPILAITOS_OHJAUS_SUBJECTS, starRatings),
    [starRatings]
  );
  const isChecklistFilled = selectedCheckboxes.length > 0;

  const workplaceRatedCount = TYOPAIKKA_OHJAUS_SUBJECTS.filter(
    (s) => (starRatings[s.id] ?? 0) > 0
  ).length;
  const institutionRatedCount = OPPILAITOS_OHJAUS_SUBJECTS.filter(
    (s) => (starRatings[s.id] ?? 0) > 0
  ).length;

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header section with leave button and titles */}
      <div>
        <Link
          href={leaveHref}
          className="link-quiet inline-flex items-center gap-1.5 text-sm"
        >
          {leaveLabel}
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-bold tracking-tight text-ink">
            Harjoittelun ohjauksen arviointi
          </h1>
          <span className="pill-neutral text-sm px-3 py-1">
            Step 6 of 6 · Guidance evaluation
          </span>
        </div>

        <p className="meta mt-1 text-sm text-ink-muted">
          Post-internship evaluation for workplace supervision and academic guidance
        </p>
      </div>

      {/* Role and Status Context Banner / Locked Notice Card */}
      {isLocked && !isTeacher ? (
        <LockedNoticeCard
          title="Lomake on lukittu"
          badge="Esikatselutila"
          message="Tämä arviointi aukeaa, kun ohjaava opettaja on hyväksynyt loppuraporttisi."
          timelineHref="/"
          timelineLabel="Katso aikajana yleisnäkymässä"
          currentStepHref="/reports"
          currentStepLabel="Siirry nykyiseen vaiheeseen: Raportti"
        />
      ) : (
        <section className="rounded-card border border-border bg-surface p-5">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`size-2.5 rounded-full ${
                    isTeacher ? "bg-info" : "bg-success"
                  }`}
                />
                <h2 className="text-sm font-semibold text-ink">
                  {isTeacher
                    ? "Ohjaavan opettajan näkymä (Read-only review)"
                    : "Harjoitteluraportti hyväksytty · Lomake auki"}
                </h2>
              </div>
              <p className="mt-1 text-sm text-ink-muted leading-relaxed">
                {isTeacher
                  ? "Tarkastelet opiskelijan täyttämää ohjauksen arviointia ja palautetta lukutilassa."
                  : "Harjoitteluraporttisi on hyväksytty. Voit nyt täyttää ja vahvistaa ohjauksen arvioinnin."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <span
                className={isTeacher ? "pill-info shrink-0" : "pill-success shrink-0"}
              >
                {isTeacher ? "Teacher view" : "Ready for submission"}
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Feedback message banner if present */}
      {savedFeedback && (
        <div className="rounded-control bg-success-soft border border-success/20 px-4 py-3 text-sm text-success transition-all">
          ✓ {savedFeedback}
        </div>
      )}

      {/* Main 2-column content layout matching Plan & Report */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_21rem]">
        {/* Left Column: Form Sections enclosed in a single unified card */}
        <div className="flex flex-col gap-6">
          <section className="card flex flex-col gap-8">
            {/* Section 1: Checkbox Group */}
            <CheckboxGroup
              heading="Asiat, joita pitäisi käydä tarkemmin läpi"
              subject="Merkitse aihealueet, joiden läpikäyntiin tai ohjaukseen toivot kiinnitettävän enemmän huomiota ennen jakson päättymistä tai loppupalautteessa:"
              items={ASIAT_TARKEMMIN_ITEMS}
              selectedIds={selectedCheckboxes}
              onChange={setSelectedCheckboxes}
              readOnly={isTeacher || isLocked}
              columns={2}
              idPrefix="guidance-checklist"
              variant="plain"
            />

            <hr className="border-border" />

            {/* Section 2: Star Rating Box 1 */}
            <StarEvaluationGroup
              id="guidance-workplace"
              heading="1. Työpaikan ohjaus ja työyhteisö"
              subject="Arvioi työpaikalla saamasi perehdytyksen, ohjauksen ja työyhteisön ilmapiirin toteutumista asteikolla 1–5 tähteä:"
              maxStars={5}
              items={TYOPAIKKA_OHJAUS_SUBJECTS}
              values={starRatings}
              onChange={handleRatingChange}
              readOnly={isTeacher || isLocked}
              collapsibleOnComplete={true}
              defaultExpanded={true}
              scaleLegend={{
                labels: [
                  "Heikko / Ei vastannut",
                  "Välttävä",
                  "Tyydyttävä",
                  "Hyvä",
                  "Erinomainen / Vastasi täysin",
                ],
              }}
              variant="plain"
            />

            <hr className="border-border" />

            {/* Section 3: Star Rating Box 2 */}
            <StarEvaluationGroup
              id="guidance-institution"
              heading="2. Oppilaitoksen tuki ja harjoittelun kokonaisarvio"
              subject="Arvioi oppilaitoksen tarjoamaa ohjausta ja koko harjoittelujakson antia ammatilliselle kehittymisellesi:"
              maxStars={5}
              items={OPPILAITOS_OHJAUS_SUBJECTS}
              values={starRatings}
              onChange={handleRatingChange}
              readOnly={isTeacher || isLocked}
              collapsibleOnComplete={true}
              defaultExpanded={true}
              scaleLegend={{
                labels: [
                  "Riittämätön / Välttävä",
                  "Kohtalainen",
                  "Tyydyttävä",
                  "Hyvä",
                  "Kiitettävä / Erinomainen",
                ],
              }}
              variant="plain"
            />

            {/* Action buttons inside form card */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border pt-6">
              <Link href={leaveHref} className="btn-secondary">
                {leaveLabel}
              </Link>

              {!isTeacher && (
                <div className="flex flex-wrap items-center gap-3">
                  {!isLocked ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        className="btn-secondary"
                      >
                        Tallenna luonnos
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSavedFeedback("Ohjauksen arviointi lähetetty onnistuneesti!");
                          setTimeout(() => setSavedFeedback(null), 4500);
                        }}
                        className="btn-primary"
                      >
                        Vahvista ja lähetä arviointi
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-ink-muted">
                      Lomake on lukittu · Aukeaa raportin hyväksynnän jälkeen
                    </span>
                  )}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right Column: Submission Checklist */}
        <aside className="card flex flex-col gap-5 sticky top-6">
          <h2 className="text-base font-semibold text-ink">
            {isTeacher ? "Arvioinnin tila" : "Ennen lähetystä"}
          </h2>

          <ul className="flex flex-col gap-3.5 text-sm">
            <li className="flex items-center gap-3">
              <ChecklistIcon done={isChecklistFilled} />
              <span className="text-ink">
                Kehityskohteet merkitty{" "}
                <span className="text-ink-muted">
                  ({selectedCheckboxes.length}/{ASIAT_TARKEMMIN_ITEMS.length})
                </span>
              </span>
            </li>

            <li className="flex items-center gap-3">
              <ChecklistIcon done={isWorkplaceComplete} />
              <span className="text-ink">
                Työpaikan ohjaus arvioitu{" "}
                <span className="text-ink-muted">
                  ({workplaceRatedCount}/{TYOPAIKKA_OHJAUS_SUBJECTS.length})
                </span>
              </span>
            </li>

            <li className="flex items-center gap-3">
              <ChecklistIcon done={isInstitutionComplete} />
              <span className="text-ink">
                Oppilaitoksen tuki arvioitu{" "}
                <span className="text-ink-muted">
                  ({institutionRatedCount}/{OPPILAITOS_OHJAUS_SUBJECTS.length})
                </span>
              </span>
            </li>
          </ul>

          {/* Context guidance note matching Plan and Report */}
          <div className="mt-1 rounded-control bg-brand-soft p-4 text-sm text-brand-ink leading-relaxed">
            <p className="font-semibold text-xs tracking-wider uppercase mb-1">
              Palaute kehittää ohjausta
            </p>
            <p>
              Vastauksesi auttavat kehittämään harjoittelupaikkojen ohjauskäytäntöjä ja Metropolian harjoittelun tukipalveluita tuleville opiskelijoille.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
