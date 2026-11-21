"use client";

import React, { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useReport } from "@/context/ReportContext";
import { useInternship } from "@/context/InternshipContext";
import { apiFetch } from "@/lib/api";
import { registerDraftFlusher } from "@/lib/draft-registry";
import LockedNoticeCard from "@/components/lockedNoticeCard";
import StepStatusBanner from "@/components/stepStatusBanner";
import SubmissionChecklist from "@/components/submissionChecklist";
import ProcessPageHeader from "@/components/processPageHeader";
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
export const ASIAT_TARKEMMIN_ITEMS: CheckboxItem[] = [
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

export const TEACHER_SAMPLE_RATINGS: Record<string, number> = {
  tyopaikkaohjaus: 4,
  tehtavat_vastaavuus: 5,
  tyoyhteiso: 5,
  oppilaitos_ohjaus: 4,
  kokonaisarvio: 5,
};

function GuidanceEvaluationContent() {
  const { user } = useAuth();
  const { report, reports } = useReport();
  const {
    activeInternship,
    isEvaluationLocked,
    refreshInternships,
  } = useInternship();

  const searchParams = useSearchParams();
  const queryInternshipId = searchParams.get("internshipId") || searchParams.get("id");
  const internshipId = queryInternshipId
    ? parseInt(queryInternshipId, 10)
    : activeInternship?.backendId || (activeInternship?.id === "internship-2" ? 2 : 1);

  const isTeacher = user?.role === "teacher" || (user?.role as string) === "TEACHER";
  const leaveHref = isTeacher ? "/teacher-view" : "/";
  const leaveLabel = isTeacher ? "← Back to teacher view" : "← Back to overview";

  const isActualReportApproved = Boolean(activeInternship?.isReportApproved);
  const isLocked = isTeacher ? false : isEvaluationLocked ?? !isActualReportApproved;

  // Local state for dynamic checklist items & star evaluations
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([
    "tavoitteet",
    "palaute",
  ]);
  const [studentRatings, setStudentRatings] = useState<Record<string, number>>({
    tyopaikkaohjaus: 0,
    tehtavat_vastaavuus: 0,
    tyoyhteiso: 0,
    oppilaitos_ohjaus: 0,
    kokonaisarvio: 0,
  });

  const [evaluationStatus, setEvaluationStatus] = useState<"DRAFT" | "SUBMITTED">("DRAFT");
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  const showNotification = (type: "success" | "error" | "info", text: string) => {
    setNotification({ type, text });
    setTimeout(() => setNotification(null), 4500);
  };

  // Fetch guidance evaluation from backend on mount or when internshipId changes
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setLoadError(null);

    // If activeInternship has pre-seeded evaluation data (e.g. Eetu), initialize with it
    const evalData = activeInternship?.evaluation;
    if (evalData) {
      if (Array.isArray(evalData.checklist)) {
        setSelectedCheckboxes(evalData.checklist);
      }
      if (evalData.ratings && typeof evalData.ratings === "object") {
        setStudentRatings(evalData.ratings);
      }
      const st = (evalData.status || "DRAFT").toUpperCase();
      setEvaluationStatus(st === "SUBMITTED" ? "SUBMITTED" : "DRAFT");
      setSubmittedAt(evalData.submittedAt || null);
    } else {
      setSelectedCheckboxes(["tavoitteet", "palaute"]);
      setStudentRatings({
        tyopaikkaohjaus: 0,
        tehtavat_vastaavuus: 0,
        tyoyhteiso: 0,
        oppilaitos_ohjaus: 0,
        kokonaisarvio: 0,
      });
      setEvaluationStatus("DRAFT");
      setSubmittedAt(null);
    }

    apiFetch<{ evaluation: any }>(`/internships/${internshipId}/guidance-evaluation`)
      .then((data) => {
        if (!isMounted) return;
        if (data?.evaluation) {
          if (Array.isArray(data.evaluation.checklist)) {
            setSelectedCheckboxes(data.evaluation.checklist);
          }
          if (data.evaluation.ratings && typeof data.evaluation.ratings === "object") {
            setStudentRatings((prev) => ({
              ...prev,
              ...data.evaluation.ratings,
            }));
          }
          const st = (data.evaluation.status || "DRAFT").toUpperCase();
          setEvaluationStatus(st === "SUBMITTED" ? "SUBMITTED" : "DRAFT");
          setSubmittedAt(data.evaluation.submittedAt || null);
        } else {
          // If teacher and no data yet, provide sample preview ratings so page is informative
          if (isTeacher) {
            setStudentRatings(TEACHER_SAMPLE_RATINGS);
          }
          if (!evalData) {
            setEvaluationStatus("DRAFT");
            setSubmittedAt(null);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        if (err?.status === 404) {
          if (isTeacher) setStudentRatings(TEACHER_SAMPLE_RATINGS);
          if (!evalData) setEvaluationStatus("DRAFT");
        } else {
          if (!evalData) {
            setLoadError(err instanceof Error ? err.message : "Failed to load evaluation.");
          }
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [internshipId, isTeacher, activeInternship]);

  const isSubmitted = evaluationStatus === "SUBMITTED";
  const isEffectivelyReadOnly = isTeacher || isLocked || isSubmitted;

  const handleRatingChange = (subjectId: string, rating: number) => {
    if (isEffectivelyReadOnly) return;
    setStudentRatings((prev) => ({
      ...prev,
      [subjectId]: rating,
    }));
  };

  const handleSaveDraft = async () => {
    if (isEffectivelyReadOnly || isSaving || isSubmitting) return;

    setIsSaving(true);
    try {
      await apiFetch(`/internships/${internshipId}/guidance-evaluation`, {
        method: "POST",
        body: JSON.stringify({
          checklist: selectedCheckboxes,
          ratings: studentRatings,
          status: "DRAFT",
        }),
      });
      showNotification("success", "Arviointiluonnos tallennettu onnistuneesti!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Luonnoksen tallennus epäonnistui.";
      showNotification("error", msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Register flusher for pre-logout draft sync / persistence
  useEffect(() => {
    if (isEffectivelyReadOnly) return;
    return registerDraftFlusher("guidance-evaluation", async (): Promise<boolean> => {
      try {
        await apiFetch(`/internships/${internshipId}/guidance-evaluation`, {
          method: "POST",
          body: JSON.stringify({
            checklist: selectedCheckboxes,
            ratings: studentRatings,
            status: "DRAFT",
          }),
        });
        return true;
      } catch {
        return false;
      }
    });
  }, [isEffectivelyReadOnly, internshipId, selectedCheckboxes, studentRatings]);

  // Checklist completion states
  const isWorkplaceComplete = useMemo(
    () => isEvaluationGroupComplete(TYOPAIKKA_OHJAUS_SUBJECTS, studentRatings),
    [studentRatings]
  );
  const isInstitutionComplete = useMemo(
    () => isEvaluationGroupComplete(OPPILAITOS_OHJAUS_SUBJECTS, studentRatings),
    [studentRatings]
  );
  const isChecklistFilled = selectedCheckboxes.length > 0;

  const workplaceRatedCount = TYOPAIKKA_OHJAUS_SUBJECTS.filter(
    (s) => (studentRatings[s.id] ?? 0) > 0
  ).length;
  const institutionRatedCount = OPPILAITOS_OHJAUS_SUBJECTS.filter(
    (s) => (studentRatings[s.id] ?? 0) > 0
  ).length;

  const handleSubmit = async () => {
    if (isEffectivelyReadOnly || isSaving || isSubmitting) return;

    if (!isWorkplaceComplete || !isInstitutionComplete) {
      showNotification("error", "Arvioi kaikki 5 kohtaa tähdillä ennen lähettämistä.");
      return;
    }

    if (!isChecklistFilled) {
      showNotification("error", "Valitse vähintään yksi kehityskohde ennen lähettämistä.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiFetch<{ evaluation: any }>(
        `/internships/${internshipId}/guidance-evaluation`,
        {
          method: "POST",
          body: JSON.stringify({
            checklist: selectedCheckboxes,
            ratings: studentRatings,
            status: "SUBMITTED",
          }),
        }
      );
      setEvaluationStatus("SUBMITTED");
      setSubmittedAt(res.evaluation?.submittedAt || new Date().toISOString());
      showNotification("success", "Ohjauksen arviointi lähetetty onnistuneesti!");
      await refreshInternships();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Arvioinnin lähetys epäonnistui.";
      showNotification("error", msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Header section with leave button and titles */}
      <ProcessPageHeader
        title="Harjoittelun ohjauksen arviointi"
        backHref={leaveHref}
        backLabel={leaveLabel}
        statusBadge={
          isTeacher ? (
            <span className="pill-info text-sm px-3 py-1">Teacher view</span>
          ) : isSubmitted ? (
            <span className="pill-success text-sm px-3 py-1">Submitted</span>
          ) : isLocked ? (
            <span className="pill-neutral text-sm px-3 py-1">
              Step 6 of 6 · Guidance evaluation
            </span>
          ) : (
            <span className="pill-success text-sm px-3 py-1">
              Ready for submission
            </span>
          )
        }
        subtitle="Post-internship evaluation for workplace supervision and academic guidance"
      />

      {/* Role and Status Context Banner / Locked Notice Card */}
      {isLocked && !isTeacher ? (
        <LockedNoticeCard
          title="Lomake on lukittu"
          badge="Esikatselutila"
          message="Tämä arviointi aukeaa, kun ohjaava opettaja on hyväksynyt loppuraporttisi."
          timelineHref="/"
          timelineLabel="Katso aikajana yleisnäkymässä"
          currentStepHref="/report"
          currentStepLabel="Siirry nykyiseen vaiheeseen: Raportti"
        />
      ) : isSubmitted ? (
        <StepStatusBanner
          step="evaluation"
          variant="feedback"
          title="Harjoittelun ohjauksen arviointi lähetetty"
          description={`Kiitos palautteestasi! Arviointi on tallennettu ja vahvistettu${
            submittedAt ? ` (${new Date(submittedAt).toLocaleDateString("fi-FI")})` : ""
          }.`}
          badge="Submitted"
          showDot={true}
        />
      ) : (
        <StepStatusBanner
          step="evaluation"
          variant={isTeacher ? "review" : "feedback"}
          title={
            isTeacher
              ? "Ohjaavan opettajan näkymä (Read-only review)"
              : "Harjoitteluraportti hyväksytty · Lomake auki"
          }
          description={
            isTeacher
              ? "Tarkastelet opiskelijan täyttämää ohjauksen arviointia ja palautetta lukutilassa."
              : "Harjoitteluraporttisi on hyväksytty. Voit nyt täyttää ja vahvistaa ohjauksen arvioinnin."
          }
          badge={isTeacher ? "Teacher view" : "Ready for submission"}
          showDot={true}
        />
      )}

      {/* Load error banner if any */}
      {loadError && (
        <div className="rounded-control bg-danger-soft border border-danger/20 p-4 text-sm text-danger flex items-center justify-between">
          <p>{loadError}</p>
        </div>
      )}

      {/* Feedback notification toast if present */}
      {notification && (
        <div
          className={`rounded-control px-4 py-3 text-sm transition-all border ${
            notification.type === "success"
              ? "bg-success-soft text-success border-success/20"
              : notification.type === "error"
              ? "bg-danger-soft text-danger border-danger/20"
              : "bg-surface-muted text-ink border-border"
          }`}
        >
          {notification.text}
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
              readOnly={isEffectivelyReadOnly}
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
              values={studentRatings}
              onChange={handleRatingChange}
              readOnly={isEffectivelyReadOnly}
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
              values={studentRatings}
              onChange={handleRatingChange}
              readOnly={isEffectivelyReadOnly}
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
                  {!isLocked && !isSubmitted ? (
                    <>
                      <button
                        type="button"
                        onClick={handleSaveDraft}
                        disabled={isSaving || isSubmitting}
                        className="btn-secondary"
                      >
                        {isSaving ? "Tallennetaan..." : "Tallenna luonnos"}
                      </button>
                      <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSaving || isSubmitting}
                        className="btn-primary"
                      >
                        {isSubmitting ? "Lähetetään..." : "Vahvista ja lähetä arviointi"}
                      </button>
                    </>
                  ) : isSubmitted ? (
                    <span className="pill-success text-xs font-semibold py-1.5 px-3">
                      ✓ Arviointi lähetetty
                    </span>
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
        <SubmissionChecklist
          title={isTeacher ? "Arvioinnin tila" : isSubmitted ? "Arviointi palautettu" : "Ennen lähetystä"}
          sticky={true}
          items={[
            {
              id: "topics",
              done: isChecklistFilled,
              label: (
                <>
                  Kehityskohteet merkitty{" "}
                  <span className="text-ink-muted">
                    ({selectedCheckboxes.length}/{ASIAT_TARKEMMIN_ITEMS.length})
                  </span>
                </>
              ),
            },
            {
              id: "workplace",
              done: isWorkplaceComplete,
              label: (
                <>
                  Työpaikan ohjaus arvioitu{" "}
                  <span className="text-ink-muted">
                    ({workplaceRatedCount}/{TYOPAIKKA_OHJAUS_SUBJECTS.length})
                  </span>
                </>
              ),
            },
            {
              id: "institution",
              done: isInstitutionComplete,
              label: (
                <>
                  Oppilaitoksen tuki arvioitu{" "}
                  <span className="text-ink-muted">
                    ({institutionRatedCount}/{OPPILAITOS_OHJAUS_SUBJECTS.length})
                  </span>
                </>
              ),
            },
          ]}
          note={{
            title: "Palaute kehittää ohjausta",
            text: "Vastauksesi auttavat kehittämään harjoittelupaikkojen ohjauskäytäntöjä ja Metropolian harjoittelun tukipalveluita tuleville opiskelijoille.",
          }}
        />
      </div>
    </div>
  );
}

export default function GuidanceEvaluationPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-ink-muted">
          Ladataan arviointia...
        </div>
      }
    >
      <GuidanceEvaluationContent />
    </Suspense>
  );
}
