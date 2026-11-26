"use client";

import React, { useState, useEffect, useMemo, Suspense, type ChangeEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useReport } from "@/context/ReportContext";
import { useInternship } from "@/context/InternshipContext";
import { GOAL_STATUS_LABELS, type GoalStatus } from "@/lib/report-helpers";
import StepStatusBanner from "@/components/stepStatusBanner";
import SubmissionChecklist from "@/components/submissionChecklist";
import ProcessPageHeader from "@/components/processPageHeader";
import LockedNoticeCard from "@/components/lockedNoticeCard";
import { CollapsiblePlanSection } from "@/components/collapsiblePlanSection";

function ReportEditor() {
  const searchParams = useSearchParams();
  const queryId = searchParams.get("id");
  const { activeInternship, targetHours } = useInternship();

  const {
    report,
    reports,
    activeReportId,
    setActiveReportId,
    updateField,
    updateGoalReflection,
    addAttachment,
    removeAttachment,
    saveDraft,
    submitReport,
    saveStatus,
    lastSavedAt,
    wordCount,
    checklist,
  } = useReport();

  // If a specific report id was passed in the URL, switch to it
  useEffect(() => {
    if (queryId && queryId !== activeReportId && reports.some((r) => r.id === queryId)) {
      setActiveReportId(queryId);
    }
  }, [queryId, activeReportId, reports, setActiveReportId]);

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
    const res = await submitReport();
    if (res.success) {
      showNotification(
        "success",
        "Raportti lähetetty onnistuneesti! Opettajallesi on ilmoitettu."
      );
    } else {
      showNotification("error", res.message || "Täytä kaikki vaaditut kohdat.");
    }
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const sizeStr = `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      addAttachment(file.name, sizeStr);
      showNotification("success", `Liitetty "${file.name}"`);
      e.target.value = "";
    }
  };

  const isApproved = report.status === "approved";
  const isSubmitted = report.status === "submitted";
  const isReadOnly = isApproved || isSubmitted;

  // Precondition Guard: Check if Plan is approved
  const isPlanApproved =
    activeInternship?.plan?.status === "approved" ||
    activeInternship?.isPlanApproved;

  // Section collapsible state
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({
    workplace: false,
    reflections: false,
    attachments: false,
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
      workplace: nextState,
      reflections: nextState,
      attachments: nextState,
    });
  };

  // Summaries when collapsed
  const workplaceSummary = `${report.company || activeInternship?.company || "Työnantaja"} · ${
    report.startDate && report.endDate
      ? `${report.startDate} – ${report.endDate}`
      : "Aikataulu hyväksytystä suunnitelmasta"
  } · ${report.realizedHours || report.totalHours || targetHours} h`;

  const reflectionsSummary = `${wordCount} / 300 sanaa · ${report.goalReflections?.length || 0} oppimistavoitetta`;
  const attachmentsSummary = `${report.attachments?.length || 0} liitetiedostoa`;

  if (!isPlanApproved) {
    return (
      <div className="flex flex-col gap-6">
        <ProcessPageHeader
          title="Harjoitteluraportti ja työtodistus"
          status="draft"
          subtitle="Vaihe 2 / 3 · Harjoittelun raportointi"
        />
        <LockedNoticeCard
          title="Lomake on lukittu"
          badge="Odottaa suunnitelmaa"
          message="Harjoitteluraportti avautuu täytettäväksi vasta, kun ohjaava opettaja on hyväksynyt harjoittelusuunnitelmasi."
          currentStepHref="/planning"
          currentStepLabel="Siirry harjoittelusuunnitelmaan"
        />
      </div>
    );
  }

  return (
    <>
      {/* Header section */}
      <ProcessPageHeader
        title={report.title || "Harjoitteluraportti ja työtodistus"}
        status={report.status}
        subtitle={
          isApproved
            ? `Hyväksytty ${report.approvedAt || "aikaisemmin"}`
            : isSubmitted
              ? `Lähetetty ${report.submittedAt || "äskettäin"} · Odottaa opettajan tarkistusta`
              : saveStatus === "saving"
                ? "Tallennetaan luonnosta..."
                : saveStatus === "unsaved"
                  ? "Tallentamattomia muutoksia..."
                  : saveStatus === "error"
                    ? "Tallennus epäonnistui · tallennettu paikallisesti"
                    : `Luonnos tallennettu automaattisesti · viimeksi tallennettu ${lastSavedAt || report.lastSavedAt || "äskettäin"}`
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
        step="report"
        status={report.status}
        submittedAt={report.submittedAt}
        feedback={report.teacherFeedback}
        feedbackAuthor="Mikko Laine"
      />

      {/* Main 2-column content layout */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_21rem]">
        {/* Left Column: Form Sections */}
        <div className="flex flex-col gap-6">
          <section className="card flex flex-col gap-6">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <span className="meta text-xs">
                Täytä raportti ja liitä työtodistus ennen lähettämistä.
              </span>
              <button
                type="button"
                onClick={toggleAllSections}
                className="link-quiet text-xs font-semibold text-brand hover:text-brand-hover p-1 cursor-pointer"
              >
                {areAllCollapsed ? "Avaa kaikki osiot" : "Tiivistä kaikki osiot"}
              </button>
            </div>

            {/* 1. Harjoittelupaikan ja jakson tiedot */}
            <CollapsiblePlanSection
              id="report-section-workplace"
              title="1. Harjoittelupaikan ja jakson tiedot"
              subtitle="Tiedot noudettu hyväksytystä harjoittelusuunnitelmasta."
              isComplete={checklist.isWorkplaceFilled}
              statusBadge={<span className="pill-success text-xs py-0.5 px-2">✓ Suunnitelman tiedot</span>}
              summaryPreview={workplaceSummary}
              isCollapsed={collapsedSections.workplace}
              onToggle={() => toggleSection("workplace")}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-control border border-border bg-surface-muted/50 p-3 sm:col-span-2">
                  <span className="block text-xs font-medium text-ink-muted">Organisaatio / Työnantaja</span>
                  <span className="block text-sm font-semibold text-ink mt-0.5">
                    {report.company || activeInternship?.company || "Ei määritelty"}
                  </span>
                </div>

                <div className="rounded-control border border-border bg-surface-muted/50 p-3">
                  <span className="block text-xs font-medium text-ink-muted">Aloituspäivä</span>
                  <span className="block text-sm font-semibold text-ink mt-0.5">
                    {report.startDate || "Suunnitelman mukaan"}
                  </span>
                </div>

                <div className="rounded-control border border-border bg-surface-muted/50 p-3">
                  <span className="block text-xs font-medium text-ink-muted">Lopetuspäivä</span>
                  <span className="block text-sm font-semibold text-ink mt-0.5">
                    {report.endDate || "Suunnitelman mukaan"}
                  </span>
                </div>

                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="realized-hours-input">
                    Toteutuneet työtunnit yhteensä *
                  </label>
                  <p className="hint mb-1">
                    Suunniteltu tavoite: {targetHours || 400} tuntia. Voit tarkistaa toteutuneet tunnit työtodistuksen mukaisesti.
                  </p>
                  <input
                    id="realized-hours-input"
                    type="number"
                    min={1}
                    max={2000}
                    className="input tabular max-w-xs"
                    value={report.realizedHours || report.totalHours || ""}
                    onChange={(e) => updateField("realizedHours", parseInt(e.target.value, 10) || 0)}
                    placeholder={String(targetHours || 400)}
                    disabled={isReadOnly}
                  />
                </div>
              </div>
            </CollapsiblePlanSection>

            <hr className="border-border" />

            {/* 2. Tehtävät ja oppimistavoitteiden toteutuminen */}
            <CollapsiblePlanSection
              id="report-section-reflections"
              title="2. Tehtävät ja oppimistavoitteiden toteutuminen"
              subtitle="Pohdi työn sisältöä ja arvioi oppimistavoitteidesi saavuttamista (vähintään 300 sanaa)."
              isComplete={checklist.isWordCountMet}
              statusBadge={
                checklist.isWordCountMet ? (
                  <span className="pill-success text-xs py-0.5 px-2">✓ {wordCount} sanaa</span>
                ) : (
                  <span className="pill-neutral text-xs py-0.5 px-2">{wordCount} / 300 sanaa</span>
                )
              }
              summaryPreview={reflectionsSummary}
              isCollapsed={collapsedSections.reflections}
              onToggle={() => toggleSection("reflections")}
            >
              {/* General duties summary */}
              <div>
                <div className="flex items-center justify-between">
                  <label className="field-label" htmlFor="general-summary-input">
                    Yleiskuvaus työtehtävistä ja vastuista *
                  </label>
                </div>
                <textarea
                  id="general-summary-input"
                  className="textarea min-h-36 mt-1"
                  value={report.generalSummary || report.tasksAndLearning || ""}
                  onChange={(e) => {
                    updateField("generalSummary", e.target.value);
                    updateField("tasksAndLearning", e.target.value);
                  }}
                  placeholder="Kuvaa lyhyesti työskentelytiimi, käytetyt työkalut ja keskeiset vastuualueesi..."
                  disabled={isReadOnly}
                />
              </div>

              {/* Goal reflection matrix */}
              <div className="mt-6 flex flex-col gap-4">
                <div>
                  <h3 className="text-sm font-semibold text-ink">
                    Harjoittelusuunnitelman oppimistavoitteiden toteutuminen
                  </h3>
                  <p className="hint text-xs mt-0.5">
                    Arvioi kutakin suunnitelmassa asetettua tavoitetta erikseen.
                  </p>
                </div>

                {report.goalReflections && report.goalReflections.length > 0 ? (
                  report.goalReflections.map((goal, index) => (
                    <div
                      key={goal.goalId || index}
                      className="rounded-control border border-border bg-surface p-4 flex flex-col gap-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                        <span className="text-sm font-medium text-ink">
                          <strong className="text-brand mr-1.5">{index + 1}.</strong>
                          {goal.goalText}
                        </span>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {(["ACHIEVED", "PARTIALLY_ACHIEVED", "NOT_ACHIEVED"] as GoalStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              disabled={isReadOnly}
                              onClick={() => updateGoalReflection(goal.goalId, { status: st })}
                              className={`text-xs px-2.5 py-1 rounded-control border transition-all ${
                                goal.status === st
                                  ? st === "ACHIEVED"
                                    ? "bg-success-soft text-success border-success/30 font-semibold"
                                    : st === "PARTIALLY_ACHIEVED"
                                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 font-semibold"
                                    : "bg-danger-soft text-danger border-danger/30 font-semibold"
                                  : "bg-surface-muted/40 text-ink-muted border-border hover:bg-surface-muted"
                              } ${isReadOnly ? "cursor-default opacity-80" : "cursor-pointer"}`}
                            >
                              {GOAL_STATUS_LABELS[st]}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <textarea
                          className="textarea min-h-24 text-sm"
                          value={goal.reflection || ""}
                          onChange={(e) =>
                            updateGoalReflection(goal.goalId, { reflection: e.target.value })
                          }
                          placeholder={`Miten saavutit tämän tavoitteen? Mitä opit ja missä ilmeni haasteita?`}
                          disabled={isReadOnly}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-control border border-dashed border-border p-4 text-center text-sm text-ink-muted">
                    Suunnitelmasta ei löytynyt erillisiä oppimistavoitteita. Kuvaa oppimistulokset yllä olevassa yleiskuvauksessa.
                  </div>
                )}
              </div>
            </CollapsiblePlanSection>

            <hr className="border-border" />

            {/* 3. Työtodistus ja liitteet */}
            <CollapsiblePlanSection
              id="report-section-attachments"
              title="3. Työtodistus ja liitteet"
              subtitle="Virallinen työtodistus on pakollinen harjoittelun hyväksymiseksi."
              isComplete={checklist.hasWorkCertificate}
              statusBadge={
                checklist.hasWorkCertificate ? (
                  <span className="pill-success text-xs py-0.5 px-2">✓ Liite lisätty</span>
                ) : (
                  <span className="pill-neutral text-xs py-0.5 px-2">Työtodistus puuttuu</span>
                )
              }
              summaryPreview={attachmentsSummary}
              isCollapsed={collapsedSections.attachments}
              onToggle={() => toggleSection("attachments")}
            >
              <div className="flex flex-wrap items-center gap-3">
                {report.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="group flex items-center justify-between gap-4 rounded-control border border-border bg-surface-muted px-4 py-2.5 min-w-[280px]"
                  >
                    <span className="text-sm font-medium text-ink truncate max-w-[220px]">
                      {att.name}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="pill-success text-xs">{att.status || "Uploaded"}</span>
                      {!isReadOnly && (
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-ink-subtle hover:text-danger text-sm px-1 transition-opacity"
                          title="Poista liite"
                          aria-label={`Poista ${att.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {!isReadOnly && (
                  <label className="btn-dashed relative cursor-pointer">
                    <span>+ Lisää työtodistus tai liite</span>
                    <input
                      type="file"
                      className="sr-only"
                      onChange={handleFileUpload}
                      accept=".pdf,.doc,.docx,.png,.jpg"
                    />
                  </label>
                )}
              </div>
            </CollapsiblePlanSection>
          </section>

          {/* Action buttons */}
          {!isApproved && (
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleSaveDraft}
                className="btn-secondary"
                disabled={isReadOnly}
              >
                Tallenna luonnos
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                className="btn-primary"
                disabled={!checklist.canSubmit || isReadOnly}
              >
                {isSubmitted ? "Päivitä lähetystä" : "Lähetä raportti tarkistettavaksi"}
              </button>
            </div>
          )}

          {isApproved && (
            <div className="flex items-center justify-end gap-3">
              <Link href="/guidance-evaluation" className="btn-primary">
                Siirry ohjauksen arviointiin →
              </Link>
            </div>
          )}
        </div>

        {/* Right Column: Submission Checklist */}
        <div className="flex flex-col gap-6">
          <SubmissionChecklist
            title={isApproved ? "Raportin tila" : "Tarkistuslista ennen lähetystä"}
            items={[
              {
                id: "workplace",
                done: checklist.isWorkplaceFilled,
                label: "Harjoittelupaikan tiedot noudettu",
              },
              {
                id: "certificate",
                done: checklist.hasWorkCertificate,
                label: "Virallinen työtodistus liitetty",
              },
              {
                id: "word-count",
                done: checklist.isWordCountMet,
                label: (
                  <>
                    Pohdinta vähintään 300 sanaa{" "}
                    <span className="text-ink-muted">(nyt {wordCount})</span>
                  </>
                ),
              },
            ]}
            note={
              isSubmitted && !isApproved
                ? "Raportti on toimitettu. Ohjaava opettaja tarkistaa raportin ennen kuin Vaihe 3 (Ohjauksen arviointi) avautuu."
                : !isApproved
                ? "Opettajallesi ilmoitetaan, kun lähetät raportin."
                : null
            }
          />

          {/* Step 3 Roadmap Info Card */}
          <div className="rounded-card border border-border bg-surface-muted/40 p-4 flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Seuraava vaihe
            </span>
            <span className="text-sm font-semibold text-ink">
              Vaihe 3: Harjoittelun ohjauksen arviointi
            </span>
            <p className="text-xs text-ink-muted leading-relaxed">
              {isApproved
                ? "Harjoitteluraporttisi on hyväksytty! Voit nyt täyttää ohjauksen arvioinnin."
                : "Ohjauksen arviointi avautuu täytettäväksi, kun ohjaava opettaja on hyväksynyt tämän raportin."}
            </p>
            {isApproved && (
              <Link
                href="/guidance-evaluation"
                className="mt-1 text-xs font-semibold text-brand hover:text-brand-hover inline-flex items-center gap-1"
              >
                Täytä arviointi nyt →
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ReportPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-ink-muted">
          Ladataan raporttia...
        </div>
      }
    >
      <ReportEditor />
    </Suspense>
  );
}
