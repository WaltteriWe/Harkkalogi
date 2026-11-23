"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  usePlan,
  MIN_DESCRIPTION_WORDS,
  MIN_LEARNING_GOALS,
} from "@/context/PlanContext";
import {
  calculateDurationWeeks,
  calculateEstimatedHours,
  calculateEstimatedCredits,
} from "@/lib/plan-calculations";
import DateInput from "@/components/dateInput";
import StepStatusBanner from "@/components/stepStatusBanner";
import SubmissionChecklist from "@/components/submissionChecklist";
import ProcessPageHeader from "@/components/processPageHeader";
import { CollapsiblePlanSection } from "@/components/collapsiblePlanSection";

export default function PlanningPage() {
  const { user } = useAuth();
  const {
    plan,
    setScope,
    updateField,
    addGoal,
    updateGoal,
    removeGoal,
    saveDraft,
    submitPlan,
    saveStatus,
    lastSavedAt,
    wordCount,
    checklist,
  } = usePlan();

  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);

  const showNotification = (
    type: "success" | "error" | "info",
    message: string
  ) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const handleSaveDraft = async () => {
    await saveDraft();
    showNotification("info", "Luonnos tallennettu onnistuneesti.");
  };

  const handleSubmit = async () => {
    const res = await submitPlan();
    if (res.success) {
      showNotification(
        "success",
        "Suunnitelma lähetetty hyväksyttäväksi! Opettajallesi on ilmoitettu."
      );
    } else {
      showNotification("error", res.message || "Täytä kaikki vaaditut kentät.");
    }
  };

  const isApproved = plan.status === "approved";
  const isSubmitted = plan.status === "submitted";
  const isReadOnly = isApproved || isSubmitted;

  // Real-time duration, workload hours, and credit calculations
  const weeks = useMemo(
    () => calculateDurationWeeks(plan.startDate, plan.endDate),
    [plan.startDate, plan.endDate]
  );
  const totalHours = useMemo(
    () => calculateEstimatedHours(weeks, plan.workloadType, plan.hoursPerWeek),
    [weeks, plan.workloadType, plan.hoursPerWeek]
  );
  const creditsCalc = useMemo(
    () => calculateEstimatedCredits(totalHours, plan.scope),
    [totalHours, plan.scope]
  );

  // Section collapsible state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    student: false,
    employer: false,
    terms: false,
    supervisor: false,
    duties: false,
  });

  const toggleSection = (key: string) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const areAllCollapsed = useMemo(
    () => Object.values(collapsedSections).every(Boolean),
    [collapsedSections]
  );

  const toggleAllSections = () => {
    const nextState = !areAllCollapsed;
    setCollapsedSections({
      student: nextState,
      employer: nextState,
      terms: nextState,
      supervisor: nextState,
      duties: nextState,
    });
  };

  // Section completion calculations for status badges and previews
  const isEmployerComplete = Boolean(
    plan.company?.trim() && plan.companyAddress?.trim() && plan.companyWebsite?.trim()
  );

  const isTermsComplete = Boolean(
    plan.startDate && plan.endDate && plan.startDate < plan.endDate
  );

  const isSupervisorComplete = plan.isPaid
    ? true
    : Boolean(
        plan.supervisorName?.trim() &&
        plan.supervisorTitle?.trim() &&
        plan.supervisorPhone?.trim() &&
        plan.supervisorEmail?.trim()
      );

  const validGoalCount = plan.learningGoals.filter((g) => g.text.trim().length > 0).length;
  const isDutiesComplete = wordCount >= MIN_DESCRIPTION_WORDS && validGoalCount >= MIN_LEARNING_GOALS;

  // Summaries when collapsed
  const studentSummary = `${user?.name || "Opiskelija"} · ${user?.email || "opiskelija@metropolia.fi"} · ${
    user?.studyType === "MULTIFORM" ? "Monimuoto" : "Päivätoteutus"
  }`;

  const employerSummary = plan.company?.trim()
    ? `${plan.company}${plan.jobTitle ? ` · ${plan.jobTitle}` : ""}${plan.companyWebsite ? ` · ${plan.companyWebsite}` : ""}`
    : "Yrityksen viralliset tiedot puuttuvat";

  const termsScopeLabel =
    plan.scope === "h2"
      ? "Harjoittelu 2 (15 op)"
      : plan.scope === "combined"
      ? "Koko harjoittelu (30 op)"
      : "Harjoittelu 1 (15 op)";
  const termsWorkloadLabel =
    plan.workloadType === "PART_TIME"
      ? `Osa-aikainen (${plan.hoursPerWeek || 0} h/vko)`
      : "Kokoaikainen (37.5 h/vko)";
  const termsPaidLabel = plan.isPaid ? "Palkallinen" : "Palkaton";
  const termsSummary = `${termsScopeLabel} · ${
    plan.startDate && plan.endDate ? `${plan.startDate} – ${plan.endDate}` : "Aikataulu puuttuu"
  } · ${termsWorkloadLabel} · ${termsPaidLabel} · ${creditsCalc.credits.toFixed(1)} op`;

  const supervisorSummary = plan.supervisorName?.trim()
    ? `${plan.supervisorName}${plan.supervisorTitle ? ` (${plan.supervisorTitle})` : ""}${
        plan.supervisorEmail ? ` · ${plan.supervisorEmail}` : ""
      }`
    : plan.isPaid
    ? "Ei määritelty (vapaaehtoinen palkallisessa)"
    : "Pakolliset yhteystiedot puuttuvat";

  const supervisorStatusBadge = plan.supervisorName?.trim() ? (
    <span className="pill-success text-xs py-0.5 px-2">✓ Täytetty</span>
  ) : plan.isPaid ? (
    <span className="pill-info text-xs py-0.5 px-2">Vapaaehtoinen</span>
  ) : (
    <span className="pill-warning text-xs py-0.5 px-2">Pakollinen</span>
  );

  const dutiesSummary = `${wordCount} / ${MIN_DESCRIPTION_WORDS} sanaa · ${validGoalCount} / ${MIN_LEARNING_GOALS} oppimistavoitetta`;
  const dutiesStatusBadge = isDutiesComplete ? (
    <span className="pill-success text-xs py-0.5 px-2">
      ✓ {wordCount} sanaa · {validGoalCount} tavoitetta
    </span>
  ) : (
    <span className="pill-neutral text-xs py-0.5 px-2">
      {wordCount}/{MIN_DESCRIPTION_WORDS} sanaa · {validGoalCount}/{MIN_LEARNING_GOALS} tavoitetta
    </span>
  );

  return (
    <>
      {/* Header section */}
      <ProcessPageHeader
        title="Harjoittelusuunnitelma"
        status={plan.status}
        subtitle={
          isApproved
            ? `Hyväksytty ${plan.approvedAt || "aikaisemmin"}`
            : isSubmitted
              ? `Lähetetty ${plan.submittedAt || "äskettäin"} · Odottaa opettajan hyväksyntää`
              : saveStatus === "saving"
                ? "Tallennetaan luonnosta..."
                : saveStatus === "unsaved"
                  ? "Tallentamattomia muutoksia..."
                  : saveStatus === "error"
                    ? "Tallennus epäonnistui · tallennettu paikallisesti"
                    : `Luonnos tallennettu automaattisesti · viimeksi tallennettu ${lastSavedAt || plan.lastSavedAt || "äskettäin"}`
        }
      />

      {/* Feedback message banner if present */}
      {notification && (
        <div
          className={`rounded-control px-4 py-3 text-sm transition-all ${
            notification.type === "success"
              ? "bg-success-soft text-success border border-success/20"
              : notification.type === "error"
                ? "bg-danger-soft text-danger border border-danger/20"
                : "bg-surface-muted text-ink border border-border"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Step status banner (feedback or review) */}
      <StepStatusBanner
        step="plan"
        status={plan.status}
        submittedAt={plan.submittedAt}
        feedback={plan.teacherFeedback}
      />

      {/* Main 2-column content layout */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_21rem]">
        {/* Left Column: Form Sections */}
        <div className="flex flex-col gap-6">
          <section className="card flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="meta text-xs">
                Täytä kaikki 5 osiota ennen suunnitelman lähettämistä.
              </span>
              <button
                type="button"
                onClick={toggleAllSections}
                className="link-quiet text-xs font-semibold text-brand hover:text-brand-hover p-1 cursor-pointer"
              >
                {areAllCollapsed ? "Avaa kaikki osiot" : "Tiivistä kaikki osiot"}
              </button>
            </div>

            {/* 1. Opiskelijan tiedot (Student Details) */}
          <CollapsiblePlanSection
            id="plan-section-student"
            title="1. Opiskelijan tiedot"
            subtitle="Tiedot haetaan automaattisesti opiskelijatunnukseltasi harjoittelusopimusta varten."
            isComplete={true}
            statusBadge={<span className="pill-success text-xs py-0.5 px-2">✓ Tiedot noudettu</span>}
            summaryPreview={studentSummary}
            isCollapsed={collapsedSections.student}
            onToggle={() => toggleSection("student")}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-control border border-border bg-surface-muted/50 p-3">
                <span className="block text-xs font-medium text-ink-muted">Nimi</span>
                <span className="block text-sm font-semibold text-ink mt-0.5">
                  {user?.name || "Opiskelija"}
                </span>
              </div>

              <div className="rounded-control border border-border bg-surface-muted/50 p-3">
                <span className="block text-xs font-medium text-ink-muted">Sähköposti</span>
                <span className="block text-sm font-semibold text-ink mt-0.5 truncate">
                  {user?.email || "opiskelija@metropolia.fi"}
                </span>
              </div>

              <div className="rounded-control border border-border bg-surface-muted/50 p-3">
                <span className="block text-xs font-medium text-ink-muted">Toteutusmuoto</span>
                <span className="block text-sm font-semibold text-ink mt-0.5">
                  {user?.studyType === "MULTIFORM" ? "Monimuoto" : "Päivätoteutus"}
                </span>
              </div>
            </div>
          </CollapsiblePlanSection>

          <hr className="border-border" />

          {/* 2. Työnantajan tiedot (Employer Details) */}
          <CollapsiblePlanSection
            id="plan-section-employer"
            title="2. Työnantajan tiedot"
            subtitle="Pakolliset työnantajan viralliset tiedot harjoittelusopimukseen."
            isComplete={isEmployerComplete}
            summaryPreview={employerSummary}
            isCollapsed={collapsedSections.employer}
            onToggle={() => toggleSection("employer")}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="plan-company-input">
                  Yrityksen / organisaation virallinen nimi *
                </label>
                <input
                  id="plan-company-input"
                  type="text"
                  className="input"
                  value={plan.company}
                  onChange={(e) => updateField("company", e.target.value)}
                  placeholder="esim. Nordic Pixel Oy"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="plan-address-input">
                  Yrityksen osoite / toimipiste *
                </label>
                <input
                  id="plan-address-input"
                  type="text"
                  className="input"
                  value={plan.companyAddress}
                  onChange={(e) => updateField("companyAddress", e.target.value)}
                  placeholder="esim. Hämeentie 135 A, 00560 Helsinki"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="plan-website-input">
                  Verkkosivusto / www-osoite *
                </label>
                <input
                  id="plan-website-input"
                  type="text"
                  className="input"
                  value={plan.companyWebsite}
                  onChange={(e) => updateField("companyWebsite", e.target.value)}
                  placeholder="esim. https://nordicpixel.fi"
                  disabled={isReadOnly}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="field-label" htmlFor="plan-job-title-input">
                  Tehtävänimike harjoittelussa
                </label>
                <input
                  id="plan-job-title-input"
                  type="text"
                  className="input"
                  value={plan.jobTitle}
                  onChange={(e) => updateField("jobTitle", e.target.value)}
                  placeholder="esim. Frontend-kehittäjäharjoittelija"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </CollapsiblePlanSection>

          <hr className="border-border" />

          {/* 3. Harjoittelun ehdot ja laajuus (Terms, Scope & Workload Calculator) */}
          <CollapsiblePlanSection
            id="plan-section-terms"
            title="3. Harjoittelun ehdot ja laajuus"
            subtitle="Aikataulu ja kuormittavuus sekä kertyvien opintopisteiden arvio."
            isComplete={isTermsComplete}
            statusBadge={
              isTermsComplete ? (
                <span className="pill-success text-xs py-0.5 px-2">
                  ✓ {creditsCalc.credits.toFixed(1)} op ({weeks > 0 ? `${weeks} vko` : ""})
                </span>
              ) : undefined
            }
            summaryPreview={termsSummary}
            isCollapsed={collapsedSections.terms}
            onToggle={() => toggleSection("terms")}
          >
            {/* Jaksovalinta */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setScope("h1")}
                className={`flex flex-col text-left rounded-card border p-3 transition-all ${
                  isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                } ${
                  (plan.scope || "h1") === "h1"
                    ? "border-brand bg-brand-soft/40 ring-2 ring-brand-soft"
                    : "border-border bg-surface hover:bg-surface-muted/60"
                }`}
              >
                <span className="text-sm font-semibold text-ink">Harjoittelu 1</span>
                <span className="meta text-xs text-ink-muted">15 op · tavoite 400 h</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setScope("h2")}
                className={`flex flex-col text-left rounded-card border p-3 transition-all ${
                  isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                } ${
                  plan.scope === "h2"
                    ? "border-brand bg-brand-soft/40 ring-2 ring-brand-soft"
                    : "border-border bg-surface hover:bg-surface-muted/60"
                }`}
              >
                <span className="text-sm font-semibold text-ink">Harjoittelu 2</span>
                <span className="meta text-xs text-ink-muted">15 op · tavoite 400 h</span>
              </button>

              <button
                type="button"
                disabled={isReadOnly}
                onClick={() => setScope("combined")}
                className={`flex flex-col text-left rounded-card border p-3 transition-all ${
                  isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                } ${
                  plan.scope === "combined"
                    ? "border-brand bg-brand-soft/40 ring-2 ring-brand-soft"
                    : "border-border bg-surface hover:bg-surface-muted/60"
                }`}
              >
                <span className="text-sm font-semibold text-ink">Koko harjoittelu</span>
                <span className="meta text-xs text-ink-muted">30 op · tavoite 800 h</span>
              </button>
            </div>

            {/* Päivämäärät ja työaika */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <DateInput
                id="plan-start-input"
                label="Aloituspäivä *"
                value={plan.startDate}
                onChange={(value) => updateField("startDate", value)}
                max={plan.endDate}
                disabled={isReadOnly}
              />

              <DateInput
                id="plan-end-input"
                label="Lopetuspäivä *"
                value={plan.endDate}
                onChange={(value) => updateField("endDate", value)}
                min={plan.startDate}
                disabled={isReadOnly}
              />
            </div>

            {/* Työaikamuoto ja viikkotunnit */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Työaikamuoto *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => updateField("workloadType", "FULL_TIME")}
                    className={`py-2 px-3 text-sm font-medium rounded-control border text-center transition-all ${
                      isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                    } ${
                      plan.workloadType === "FULL_TIME"
                        ? "border-brand bg-brand-soft/50 text-brand font-semibold"
                        : "border-border bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    Kokoaikainen (37.5 h/vko)
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => updateField("workloadType", "PART_TIME")}
                    className={`py-2 px-3 text-sm font-medium rounded-control border text-center transition-all ${
                      isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                    } ${
                      plan.workloadType === "PART_TIME"
                        ? "border-brand bg-brand-soft/50 text-brand font-semibold"
                        : "border-border bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    Osa-aikainen
                  </button>
                </div>
              </div>

              {plan.workloadType === "PART_TIME" ? (
                <div>
                  <label className="field-label" htmlFor="plan-weekly-input">
                    Työtunnit viikossa (1–60 h) *
                  </label>
                  <input
                    id="plan-weekly-input"
                    type="number"
                    min={1}
                    max={60}
                    step={0.5}
                    className="input tabular mt-1"
                    value={plan.hoursPerWeek}
                    onChange={(e) => updateField("hoursPerWeek", e.target.value)}
                    placeholder="esim. 20"
                    disabled={isReadOnly}
                  />
                </div>
              ) : (
                <div>
                  <label className="field-label">Sopimustunnit viikossa</label>
                  <div className="input bg-surface-muted text-ink-muted mt-1 select-none">
                    37.5 tuntia / viikko (vakio)
                  </div>
                </div>
              )}
            </div>

            {/* Kansainvälisyys ja palkallisuus */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label">Harjoittelun sijainti *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => updateField("isInternational", false)}
                    className={`py-2 px-3 text-sm font-medium rounded-control border text-center transition-all ${
                      isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                    } ${
                      !plan.isInternational
                        ? "border-brand bg-brand-soft/50 text-brand font-semibold"
                        : "border-border bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    Kotimaa
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => updateField("isInternational", true)}
                    className={`py-2 px-3 text-sm font-medium rounded-control border text-center transition-all ${
                      isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                    } ${
                      plan.isInternational
                        ? "border-brand bg-brand-soft/50 text-brand font-semibold"
                        : "border-border bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    Ulkomailla (Kv)
                  </button>
                </div>
              </div>

              <div>
                <label className="field-label">Palkallisuus *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => updateField("isPaid", true)}
                    className={`py-2 px-3 text-sm font-medium rounded-control border text-center transition-all ${
                      isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                    } ${
                      plan.isPaid
                        ? "border-brand bg-brand-soft/50 text-brand font-semibold"
                        : "border-border bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    Palkallinen
                  </button>
                  <button
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => updateField("isPaid", false)}
                    className={`py-2 px-3 text-sm font-medium rounded-control border text-center transition-all ${
                      isReadOnly ? "opacity-75 cursor-default" : "cursor-pointer"
                    } ${
                      !plan.isPaid
                        ? "border-brand bg-brand-soft/50 text-brand font-semibold"
                        : "border-border bg-surface text-ink hover:bg-surface-muted"
                    }`}
                  >
                    Palkaton
                  </button>
                </div>
              </div>
            </div>

            {/* Automaattinen laskuri / Summary Card */}
            <div className="mt-5 rounded-card border border-border bg-surface-muted/40 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Automaattinen kesto- ja opintopistelaskuri
                </span>
                {creditsCalc.isMet ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-0.5 text-xs font-medium text-success border border-success/20">
                    ✓ Tavoite saavutettu
                  </span>
                ) : weeks > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-600 border border-amber-500/20">
                    Huomio: Alle {creditsCalc.targetCredits} op
                  </span>
                ) : null}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <span className="block text-xs text-ink-muted">Harjoitteluviikot</span>
                  <span className="text-lg font-bold text-ink tabular">
                    {weeks > 0 ? `${weeks} vko` : "—"}
                  </span>
                  <span className="block text-[11px] text-ink-muted mt-0.5">
                    {weeks > 0 ? `${Math.round(weeks * 7)} kalenteripäivää` : "Syötä päivät"}
                  </span>
                </div>

                <div>
                  <span className="block text-xs text-ink-muted">Arvioidut työtunnit</span>
                  <span className="text-lg font-bold text-ink tabular">
                    {totalHours > 0 ? `~${totalHours} h` : "—"}
                  </span>
                  <span className="block text-[11px] text-ink-muted mt-0.5">
                    {plan.workloadType === "PART_TIME"
                      ? `${plan.hoursPerWeek || 0} h / vko`
                      : "37.5 h / vko"}
                  </span>
                </div>

                <div>
                  <span className="block text-xs text-ink-muted">Kertyvät opintopisteet</span>
                  <span className="text-lg font-bold text-ink tabular">
                    {creditsCalc.credits.toFixed(1)} / {creditsCalc.targetCredits} op
                  </span>
                  <span className="block text-[11px] text-ink-muted mt-0.5">
                    27 h / opintopiste
                  </span>
                </div>
              </div>

              {weeks > 0 && !creditsCalc.isMet && (
                <p className="mt-3 text-xs text-amber-700 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded-control border border-amber-500/20">
                  Harjoittelun kesto tuottaa arvion mukaan {creditsCalc.credits.toFixed(1)} opintopistettä (tavoite {creditsCalc.targetCredits} op). Voit silti lähettää suunnitelman opettajan arvioitavaksi, mikäli kyseessä on ositettu harjoittelu.
                </p>
              )}
            </div>
          </CollapsiblePlanSection>

          <hr className="border-border" />

          {/* 4. Työpaikkaohjaajan tiedot (Workplace Supervisor) */}
          <CollapsiblePlanSection
            id="plan-section-supervisor"
            title="4. Työpaikkaohjaajan tiedot"
            subtitle={plan.isPaid ? "Vapaaehtoinen (palkallinen)" : "Pakollinen (palkaton)"}
            isComplete={isSupervisorComplete}
            statusBadge={supervisorStatusBadge}
            summaryPreview={supervisorSummary}
            isCollapsed={collapsedSections.supervisor}
            onToggle={() => toggleSection("supervisor")}
          >
            {!plan.isPaid ? (
              <div className="rounded-control bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-800 dark:text-amber-300">
                <strong>Huomio:</strong> Koska harjoittelu on palkaton, oppilaitos edellyttää työpaikalta nimetyn ohjaajan yhteystiedot ja aseman organisaatiossa ohjauksen ja vastuuvakuutuksen todentamiseksi.
              </div>
            ) : (
              <p className="meta text-xs text-ink-muted">
                Palkallisessa harjoittelussa voit täyttää ohjaajan tiedot valmiiksi tai jättää ne täydennettäväksi myöhemmin.
              </p>
            )}

            {plan.supervisorContact && (
              <div className="mt-3 rounded-control bg-surface-muted/60 border border-border p-3 text-xs text-ink-muted">
                <span className="font-medium text-ink">Aiemmin tallennettu yhteystieto:</span> {plan.supervisorContact}
                <span className="block text-[11px] mt-0.5">Voit siirtää tiedot alla oleviin erillisiin kenttiin.</span>
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="field-label" htmlFor="plan-supervisor-name-input">
                  Ohjaajan koko nimi {!plan.isPaid && "*"}
                </label>
                <input
                  id="plan-supervisor-name-input"
                  type="text"
                  className="input"
                  value={plan.supervisorName}
                  onChange={(e) => updateField("supervisorName", e.target.value)}
                  placeholder="esim. Laura Nieminen"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="plan-supervisor-title-input">
                  Asema organisaatiossa / Titteli {!plan.isPaid && "*"}
                </label>
                <input
                  id="plan-supervisor-title-input"
                  type="text"
                  className="input"
                  value={plan.supervisorTitle}
                  onChange={(e) => updateField("supervisorTitle", e.target.value)}
                  placeholder="esim. Tiiminvetäjä / Senior Developer"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="plan-supervisor-phone-input">
                  Puhelinnumero {!plan.isPaid && "*"}
                </label>
                <input
                  id="plan-supervisor-phone-input"
                  type="tel"
                  className="input"
                  value={plan.supervisorPhone}
                  onChange={(e) => updateField("supervisorPhone", e.target.value)}
                  placeholder="esim. +358 40 123 4567"
                  disabled={isReadOnly}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="plan-supervisor-email-input">
                  Sähköpostiosoite {!plan.isPaid && "*"}
                </label>
                <input
                  id="plan-supervisor-email-input"
                  type="email"
                  className="input"
                  value={plan.supervisorEmail}
                  onChange={(e) => updateField("supervisorEmail", e.target.value)}
                  placeholder="esim. laura.nieminen@nordicpixel.fi"
                  disabled={isReadOnly}
                />
              </div>
            </div>
          </CollapsiblePlanSection>

          <hr className="border-border" />

          {/* 5. Työtehtävät ja omat oppimistavoitteet (Tasks & Learning Goals) */}
          <CollapsiblePlanSection
            id="plan-section-duties"
            title="5. Työtehtävät ja omat oppimistavoitteet"
            subtitle="Vähintään 100 sanaa & 3 tavoitetta tutkintovaatimusten mukaisesti."
            isComplete={isDutiesComplete}
            statusBadge={dutiesStatusBadge}
            summaryPreview={dutiesSummary}
            isCollapsed={collapsedSections.duties}
            onToggle={() => toggleSection("duties")}
          >
            <div>
              <div className="flex items-center justify-between">
                <label className="field-label" htmlFor="plan-description-input">
                  Tarkat työtehtävät ja vastuut *
                </label>
                <span
                  className={`text-xs tabular ${
                    wordCount >= MIN_DESCRIPTION_WORDS
                      ? "text-success font-medium"
                      : "text-ink-muted"
                  }`}
                >
                  {wordCount} / {MIN_DESCRIPTION_WORDS} sanaa
                </span>
              </div>
              <textarea
                id="plan-description-input"
                className="textarea min-h-44 mt-1"
                value={plan.jobDescription}
                onChange={(e) => updateField("jobDescription", e.target.value)}
                placeholder="Kuvaa tiimi, työkalut ja teknologiat, projektit sekä konkreettiset päivittäiset työtehtävät ja vastuut harjoittelun aikana..."
                disabled={isReadOnly}
              />
              {!isReadOnly && (
                <p className="hint mt-1">
                  Vähintään {MIN_DESCRIPTION_WORDS} sanaa. Sovi työtehtävistä ja vastuista etukäteen työnantajan kanssa.
                </p>
              )}
            </div>

            <div className="mt-6">
              <label className="field-label">
                Omat oppimistavoitteet (vähintään {MIN_LEARNING_GOALS} kpl) *
              </label>
              <p className="hint mt-0.5">
                Mitä osaamista haluat kehittää? Kytke tavoitteet tutkintosi osaamistavoitteisiin.
              </p>

              <ol className="mt-3 flex flex-col gap-3">
                {plan.learningGoals.map((goal, index) => (
                  <li key={goal.id} className="flex items-center gap-3">
                    <span className="tabular w-6 shrink-0 text-sm font-semibold text-ink-muted">
                      {index + 1}.
                    </span>
                    <input
                      type="text"
                      className="input"
                      value={goal.text}
                      onChange={(e) => updateGoal(goal.id, e.target.value)}
                      placeholder="esim. React- ja TypeScript-sovellusten tilanhallinnan syventäminen"
                      aria-label={`Oppimistavoite ${index + 1}`}
                      disabled={isReadOnly}
                    />
                    {!isReadOnly && (
                      <button
                        type="button"
                        onClick={() => removeGoal(goal.id)}
                        className="text-ink-subtle hover:text-danger text-sm px-1 transition-colors shrink-0 cursor-pointer"
                        title="Poista tavoite"
                        aria-label={`Poista oppimistavoite ${index + 1}`}
                      >
                        ✕
                      </button>
                    )}
                  </li>
                ))}
              </ol>

              {!isReadOnly && (
                <button
                  type="button"
                  onClick={addGoal}
                  className="btn-dashed mt-3 cursor-pointer"
                >
                  + Lisää oppimistavoite
                </button>
              )}
            </div>

            <div className="mt-6">
              <label className="field-label" htmlFor="plan-assessment-input">
                Ohjauksen ja seurannan toteutus työpaikalla
              </label>
              <textarea
                id="plan-assessment-input"
                className="textarea mt-1"
                value={plan.assessment}
                onChange={(e) => updateField("assessment", e.target.value)}
                placeholder="esim. Viikoittaiset 1-to-1-palaverit ohjaajan kanssa, puolivälin katselmointi..."
                disabled={isReadOnly}
              />
            </div>
          </CollapsiblePlanSection>
        </section>

          {/* Action buttons aligned right */}
          {!isReadOnly ? (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn-secondary cursor-pointer"
              >
                Tallenna luonnos
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!checklist.canSubmit}
                className={`btn-primary ${
                  !checklist.canSubmit ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {isSubmitted ? "Päivitä lähetys" : "Lähetä hyväksyttäväksi"}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-surface-muted/60 p-4 rounded-control border border-border">
              <span className="text-sm text-ink-muted">
                Suunnitelma on lukittu opettajan tarkastuksen ajaksi.
              </span>
              <Link href="/" className="btn-secondary">
                Takaisin etusivulle
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Submission Checklist */}
        <SubmissionChecklist
          title={isApproved ? "Suunnitelman tila" : "Ennen lähettämistä"}
          items={[
            {
              id: "employer",
              done: checklist.isEmployerFilled,
              label: "Työnantajan tiedot (yritys, osoite, www)",
            },
            {
              id: "terms",
              done: checklist.isTermsFilled,
              label: "Harjoittelun ehdot ja aikataulu",
            },
            {
              id: "supervisor",
              done: checklist.isSupervisorFilled,
              label: plan.isPaid
                ? "Työpaikkaohjaaja (vapaaehtoinen)"
                : "Työpaikkaohjaaja (pakollinen palkattomassa)",
            },
            {
              id: "word-count",
              done: checklist.isWordCountMet,
              label: (
                <>
                  Työtehtävien kuvaus vähintään {MIN_DESCRIPTION_WORDS} sanaa{" "}
                  <span className="text-ink-muted">({wordCount} / {MIN_DESCRIPTION_WORDS})</span>
                </>
              ),
            },
            {
              id: "goals",
              done: checklist.hasEnoughGoals,
              label: `Vähintään ${MIN_LEARNING_GOALS} oppimistavoitetta`,
            },
            ...(weeks > 0 && !checklist.isCreditTargetMet
              ? [
                  {
                    id: "credits-warning",
                    done: true,
                    label: (
                      <span className="text-amber-600 text-xs font-normal">
                        Huomio: Arvioidut opintopisteet alle tavoitteen ({creditsCalc.credits.toFixed(1)} / {creditsCalc.targetCredits} op)
                      </span>
                    ),
                  },
                ]
              : []),
          ]}
          note={
            !isApproved
              ? "Suunnitelma tulee hyväksyä ennen harjoittelun aloitusta. Opettajalle lähetetään automaattinen ilmoitus."
              : null
          }
        />
      </div>
    </>
  );
}
