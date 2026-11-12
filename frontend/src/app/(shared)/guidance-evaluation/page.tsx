"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useReport } from "@/context/ReportContext";
import {
  CheckboxGroup,
  type CheckboxItem,
} from "@/components/checkboxGroup";
import {
  StarEvaluationGroup,
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

export default function GuidanceEvaluationPage() {
  const { user } = useAuth();
  const { report } = useReport();
  const isTeacher = user?.role === "teacher";
  const leaveHref = isTeacher ? "/teacher-view" : "/";
  const leaveLabel = isTeacher ? "← Back to teacher view" : "← Back to overview";

  const isActualReportApproved = report?.status === "approved";
  // Interactive test toggle: allows switching between "Lomake auki (ON)" and "Esikatselu (OFF)" during testing
  const [testUnlockedOverride, setTestUnlockedOverride] = useState<boolean | null>(null);

  const isReportApproved =
    testUnlockedOverride !== null ? testUnlockedOverride : isActualReportApproved;

  // Local state for dynamic checklist items (initialized with sensible defaults)
  const [selectedCheckboxes, setSelectedCheckboxes] = useState<string[]>([
    "tavoitteet",
    "palaute",
  ]);

  // Local state for dynamic star evaluations (subjectId -> rating)
  // For students, start at 0 so neither box is complete initially;
  // boxes start in normal expanded format by default and only collapse once all ratings in that box are selected.
  // For teachers, display sample pre-filled ratings in read-only review mode.
  const [starRatings, setStarRatings] = useState<Record<string, number>>({
    tyopaikkaohjaus: 0,
    tehtavat_vastaavuus: 0,
    tyoyhteiso: 0,
    oppilaitos_ohjaus: 0,
    kokonaisarvio: 0,
  });

  useEffect(() => {
    if (isTeacher) {
      setStarRatings({
        tyopaikkaohjaus: 4,
        tehtavat_vastaavuus: 5,
        tyoyhteiso: 5,
        oppilaitos_ohjaus: 4,
        kokonaisarvio: 5,
      });
    }
  }, [isTeacher]);

  const [savedFeedback, setSavedFeedback] = useState<string | null>(null);

  const handleRatingChange = (subjectId: string, rating: number) => {
    setStarRatings((prev) => ({
      ...prev,
      [subjectId]: rating,
    }));
  };

  const handleSaveDraft = () => {
    setSavedFeedback("Arviointiluonnos tallennettu onnistuneesti!");
    setTimeout(() => setSavedFeedback(null), 4000);
  };

  return (
    <div className="flex flex-col gap-8 pb-12">
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

      {/* Role and Status Context Banner */}
      <section className="rounded-card border border-border bg-surface p-5">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${
                  isTeacher
                    ? "bg-info"
                    : isReportApproved
                    ? "bg-success"
                    : "bg-brand"
                }`}
              />
              <h2 className="text-sm font-semibold text-ink">
                {isTeacher
                  ? "Ohjaavan opettajan näkymä (Read-only review)"
                  : isReportApproved
                  ? "Harjoitteluraportti hyväksytty · Lomake auki"
                  : "Ohjauksen arvioinnin esikatselu"}
              </h2>
            </div>
            <p className="mt-1 text-sm text-ink-muted leading-relaxed">
              {isTeacher
                ? "Tarkastelet opiskelijan täyttämää ohjauksen arviointia ja palautetta lukutilassa."
                : isReportApproved
                ? "Harjoitteluraporttisi on hyväksytty. Voit nyt täyttää ja vahvistaa ohjauksen arvioinnin."
                : "Lomake aukeaa virallisesti, kun ohjaava opettaja on vahvistanut harjoitteluraporttisi. Voit kuitenkin tutustua arviointikohteisiin ja kokeilla lomaketta ennakkoon."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Clickable state toggle button for testing on and off */}
            {!isTeacher && (
              <button
                type="button"
                onClick={() =>
                  setTestUnlockedOverride((prev) =>
                    prev !== null ? !prev : !isActualReportApproved
                  )
                }
                className="inline-flex items-center gap-2 rounded-control border border-border bg-surface-muted px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:bg-border/60 hover:text-ink focus-visible:outline-2 focus-visible:outline-brand cursor-pointer"
                title="Klikkaa vaihtaaksesi arvioinnin tilaa (Lomake auki / Esikatselu) testausta varten"
              >
                <span className="text-ink-muted text-[11px] font-mono">Testitila:</span>
                <span
                  className={
                    isReportApproved
                      ? "pill-success text-xs font-semibold"
                      : "pill-warning text-xs font-semibold"
                  }
                >
                  {isReportApproved ? "Lomake auki (ON)" : "Esikatselu (OFF)"}
                </span>
                <span className="text-ink-muted text-[11px]">⇄ Vaihda</span>
              </button>
            )}

            <span
              className={
                isTeacher
                  ? "pill-info shrink-0"
                  : isReportApproved
                  ? "pill-success shrink-0"
                  : "pill-warning shrink-0"
              }
            >
              {isTeacher
                ? "Teacher view"
                : isReportApproved
                ? "Ready for submission"
                : "Preview mode"}
            </span>
          </div>
        </div>
      </section>

      {/* Component 1: Dynamic Checkbox Group */}
      <CheckboxGroup
        heading="Asiat, joita pitäisi käydä tarkemmin läpi"
        subject="Merkitse aihealueet, joiden läpikäyntiin tai ohjaukseen toivot kiinnitettävän enemmän huomiota ennen jakson päättymistä tai loppupalautteessa:"
        items={ASIAT_TARKEMMIN_ITEMS}
        selectedIds={selectedCheckboxes}
        onChange={setSelectedCheckboxes}
        readOnly={isTeacher}
        columns={2}
        idPrefix="guidance-checklist"
      />

      {/* Star Rating Box 1: Työpaikan ohjaus ja työyhteisö */}
      <StarEvaluationGroup
        id="guidance-workplace"
        heading="1. Työpaikan ohjaus ja työyhteisö"
        subject="Arvioi työpaikalla saamasi perehdytyksen, ohjauksen ja työyhteisön ilmapiirin toteutumista asteikolla 1–5 tähteä:"
        maxStars={5}
        items={TYOPAIKKA_OHJAUS_SUBJECTS}
        values={starRatings}
        onChange={handleRatingChange}
        readOnly={isTeacher}
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
      />

      {/* Star Rating Box 2: Oppilaitoksen tuki ja harjoittelun kokonaisarvio */}
      <StarEvaluationGroup
        id="guidance-institution"
        heading="2. Oppilaitoksen tuki ja harjoittelun kokonaisarvio"
        subject="Arvioi oppilaitoksen tarjoamaa ohjausta ja koko harjoittelujakson antia ammatilliselle kehittymisellesi:"
        maxStars={5}
        items={OPPILAITOS_OHJAUS_SUBJECTS}
        values={starRatings}
        onChange={handleRatingChange}
        readOnly={isTeacher}
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
      />

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
        <Link href={leaveHref} className="btn-secondary">
          {leaveLabel}
        </Link>

        {!isTeacher && (
          <div className="flex flex-wrap items-center gap-3">
            {savedFeedback && (
              <span className="text-xs text-success font-medium animate-fade-in">
                ✓ {savedFeedback}
              </span>
            )}
            <button
              type="button"
              onClick={handleSaveDraft}
              className="btn-secondary"
            >
              Tallenna arviointiluonnos
            </button>
            {isReportApproved && (
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
            )}
          </div>
        )}
      </div>
    </div>
  );
}
