"use client";

import React, {
  createContext,
  useContext,
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { apiFetch } from "@/lib/api";

export interface InternshipContact {
  name: string;
  role: string;
  isUnassigned?: boolean;
}

export interface InternshipPlanInfo {
  status: "draft" | "submitted" | "approved";
  submittedAt?: string | null;
  approvedAt?: string | null;
  teacherFeedback?: string;
  company?: string;
  companyAddress?: string;
  companyWebsite?: string;
  jobTitle?: string;
  supervisorName?: string;
  supervisorPhone?: string;
  supervisorEmail?: string;
  supervisorTitle?: string;
  supervisorContact?: string;
  startDate?: string;
  endDate?: string;
  workloadType?: "FULL_TIME" | "PART_TIME";
  plannedHours?: number | string;
  hoursPerWeek?: number | string;
  isInternational?: boolean;
  isPaid?: boolean;
  jobDescription?: string;
  learningGoals?: Array<{ id: string; text: string }>;
  assessment?: string;
  calculatedWeeks?: number;
  estimatedHours?: number;
  estimatedCredits?: number;
}

export interface InternshipReportInfo {
  id?: string;
  status: "draft" | "submitted" | "approved";
  submittedAt?: string | null;
  approvedAt?: string | null;
  totalHours?: number | string;
  tasksAndLearning?: string;
  attachments?: Array<{ id: string; name: string; size?: string; uploadedAt?: string }>;
  teacherFeedback?: string;
}

export interface InternshipEvaluationInfo {
  status: "DRAFT" | "SUBMITTED";
  submittedAt?: string | null;
  checklist?: string[];
  ratings?: Record<string, number>;
  feedback?: string;
}

export interface InternshipItem {
  id: string;
  backendId?: number;
  order: number;
  title: string;
  scope: "h1" | "h2" | "combined";
  company: string;
  targetHours: number;
  credits: number;
  status: "ongoing" | "completed" | "not_started";
  isLocked?: boolean;
  startDate?: string;
  endDate?: string;
  supervisorName?: string;
  supervisorRole?: string;
  teacherName?: string;
  teacherRole?: string;
  plan?: InternshipPlanInfo;
  report?: InternshipReportInfo;
  evaluation?: InternshipEvaluationInfo;
  loggedHours?: number;
  isPlanApproved?: boolean;
  isPlanSubmitted?: boolean;
  isReportApproved?: boolean;
  isReportSubmitted?: boolean;
  isEvaluationSubmitted?: boolean;
  isEvaluationLocked?: boolean;
  creditsPutToOma?: boolean;
  creditsPutToOmaAt?: string | null;
  currentStepNumber?: number;
  contacts?: InternshipContact[];
}

export interface InternshipContextType {
  internships: InternshipItem[];
  activeInternshipId: string;
  activeInternship: InternshipItem;
  setActiveInternshipId: (id: string) => void;
  targetHours: number;
  loggedHours: number;
  remainingHours: number;
  isPlanApproved: boolean;
  isPlanSubmitted: boolean;
  isReportApproved: boolean;
  isReportSubmitted: boolean;
  isEvaluationSubmitted: boolean;
  isEvaluationLocked: boolean;
  creditsPutToOma: boolean;
  setCreditsPutToOma: (internshipId: number, value: boolean) => Promise<void>;
  currentStepNumber: number;
  scope: "h1" | "h2" | "combined";
  setScope: (scope: "h1" | "h2" | "combined") => void;
  contacts: InternshipContact[];
  refreshInternships: () => Promise<void>;
}

const DEFAULT_INTERNSHIPS: InternshipItem[] = [
  {
    id: "internship-1",
    backendId: 1,
    order: 1,
    title: "Harjoittelu 1",
    scope: "h1",
    company: "",
    targetHours: 400,
    credits: 15,
    status: "not_started",
    isLocked: false,
  },
  {
    id: "internship-2",
    backendId: 2,
    order: 2,
    title: "Harjoittelu 2",
    scope: "h2",
    company: "",
    targetHours: 400,
    credits: 15,
    status: "not_started",
    isLocked: true,
  },
];

const InternshipContext = createContext<InternshipContextType | undefined>(undefined);

export function InternshipProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [scope, setScopeState] = useState<"h1" | "h2" | "combined">("h1");

  const [activeInternshipId, setActiveInternshipIdState] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved =
          window.sessionStorage.getItem("harkkalogi_active_internship") ||
          window.localStorage.getItem("harkkalogi_active_internship");
        if (saved) return saved;
      } catch {
        // ignore
      }
    }
    return "internship-1";
  });
  const [backendInternships, setBackendInternships] = useState<any[] | null>(null);
  const hasInitializedRef = useRef<string | null>(null);

  const setActiveInternshipId = useCallback((id: string) => {
    setActiveInternshipIdState(id);
    if (typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem("harkkalogi_active_internship", id);
        if (user?.email) {
          window.sessionStorage.setItem(`harkkalogi_active_internship_${user.email}`, id);
        }
      } catch {
        // ignore
      }
    }
  }, [user?.email]);

  const currentScope = scope;

  // Load from /internships when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setBackendInternships(null);
      hasInitializedRef.current = null;
      return;
    }
    let isMounted = true;
    apiFetch<{ internships: any[] }>("/internships")
      .then((data) => {
        if (!isMounted) return;
        if (Array.isArray(data?.internships) && data.internships.length > 0) {
          setBackendInternships(data.internships);
        }
      })
      .catch(() => {
        // Fallback to client synthesis if offline/error
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user?.email]);

  // Adjust internships list based on backend data, scope, and plan/report state
  const internships = useMemo<InternshipItem[]>(() => {
    // 1. If backend internships are available, map them
    if (backendInternships && backendInternships.length > 0) {
      return backendInternships.map((bi) => {
        const scope: "h1" | "h2" | "combined" =
          bi.plan?.scope === "h2" ? "h2" : bi.plan?.scope === "combined" || bi.credits === 30 ? "combined" : "h1";
        const wf = bi.workflow || {};
        const biReports = Array.isArray(bi.reports) ? bi.reports : [];
        const latestReport = biReports[0] || null;
        const hasApprovedReport =
          wf.isReportApproved ??
          biReports.some(
            (r: any) =>
              (r.status || "").toLowerCase() === "reviewed" ||
              (r.status || "").toLowerCase() === "approved"
          );
        const hasSubmittedReport =
          wf.isReportSubmitted ??
          (hasApprovedReport ||
            biReports.some((r: any) => (r.status || "").toLowerCase() === "submitted"));

        const isPlanApproved = wf.isPlanApproved ?? (bi.plan?.status || "").toUpperCase() === "APPROVED";
        const isPlanSubmitted = wf.isPlanSubmitted ?? (isPlanApproved || (bi.plan?.status || "").toUpperCase() === "SUBMITTED");
        const isReportApproved = isPlanApproved && hasApprovedReport;
        const isReportSubmitted = isPlanApproved && hasSubmittedReport;
        const isEvaluationSubmitted =
          wf.isEvaluationSubmitted ??
          ((bi.guidanceEvaluation?.status || "").toUpperCase() === "SUBMITTED" && isReportApproved);
        const targetHours = wf.targetHours || bi.requiredHours || (scope === "combined" ? 800 : 400);
        const loggedHours = wf.loggedHours !== undefined ? wf.loggedHours : (isReportApproved ? targetHours : isPlanApproved ? Math.round(targetHours * 0.8) : 0);
        const status: "ongoing" | "completed" | "not_started" =
          bi.status?.toLowerCase() === "completed" || isReportApproved
            ? "completed"
            : isPlanSubmitted
            ? "ongoing"
            : "not_started";

        return {
          id: `internship-${bi.order || bi.id}`,
          backendId: typeof bi.id === "number" ? bi.id : undefined,
          order: bi.order || 1,
          title: bi.title || (scope === "h2" ? "Harjoittelu 2" : scope === "combined" ? "Koko harjoittelu" : "Harjoittelu 1"),
          scope,
          company: bi.company || bi.plan?.company || "",
          targetHours,
          loggedHours,
          credits: bi.credits || (scope === "combined" ? 30 : 15),
          status,
          isLocked: Boolean(bi.isLocked),
          startDate: bi.startDate ? String(bi.startDate).split("T")[0] : "",
          endDate: bi.endDate ? String(bi.endDate).split("T")[0] : "",
          supervisorName: bi.plan?.supervisorName?.trim() || undefined,
          supervisorRole: "Workplace supervisor",
          teacherName: bi.teacher?.name?.trim() || undefined,
          teacherRole: "Supervising teacher",
          isPlanApproved,
          isPlanSubmitted,
          isReportApproved,
          isReportSubmitted,
          isEvaluationSubmitted,
          isEvaluationLocked: wf.isEvaluationLocked ?? !isReportApproved,
          creditsPutToOma: Boolean(bi.creditsPutToOma ?? wf.creditsPutToOma),
          creditsPutToOmaAt: bi.creditsPutToOmaAt ?? wf.creditsPutToOmaAt ?? null,
          currentStepNumber: wf.currentStepNumber,
          plan: bi.plan
            ? {
                status: (bi.plan.status || "draft").toLowerCase() as any,
                submittedAt: bi.plan.submittedAt ? String(bi.plan.submittedAt).split("T")[0] : null,
                approvedAt: bi.plan.approvedAt ? String(bi.plan.approvedAt).split("T")[0] : null,
                teacherFeedback: bi.plan.teacherFeedback || "",
                company: bi.plan.company || bi.company,
                jobTitle: bi.plan.jobTitle || "",
                supervisorName: bi.plan.supervisorName,
                supervisorContact: bi.plan.supervisorContact || "",
                startDate: bi.plan.startDate ? String(bi.plan.startDate).split("T")[0] : bi.startDate ? String(bi.startDate).split("T")[0] : "",
                endDate: bi.plan.endDate ? String(bi.plan.endDate).split("T")[0] : bi.endDate ? String(bi.endDate).split("T")[0] : "",
                plannedHours: bi.plan.plannedHours || bi.requiredHours || targetHours,
                hoursPerWeek: bi.plan.hoursPerWeek || "",
                jobDescription: bi.plan.jobDescription || "",
                learningGoals: Array.isArray(bi.plan.learningGoals) ? bi.plan.learningGoals : [],
                assessment: bi.plan.assessment || "",
              }
            : undefined,
          report: latestReport
            ? {
                id: String(latestReport.id),
                status:
                  (latestReport.status || "draft").toLowerCase() === "reviewed"
                    ? "approved"
                    : ((latestReport.status || "draft").toLowerCase() as any),
                submittedAt: latestReport.submittedAt ? String(latestReport.submittedAt).split("T")[0] : null,
                approvedAt: latestReport.createdAt ? String(latestReport.createdAt).split("T")[0] : null,
                totalHours: typeof latestReport.totalHours === "number" ? latestReport.totalHours : targetHours,
                tasksAndLearning: latestReport.tasksAndLearning || latestReport.content || "",
                attachments: Array.isArray(latestReport.attachments) ? latestReport.attachments : [],
                teacherFeedback: latestReport.reviews?.[0]?.comment || "",
              }
            : undefined,
          evaluation: bi.guidanceEvaluation
            ? {
                status: (bi.guidanceEvaluation.status || "DRAFT").toUpperCase() as any,
                submittedAt: bi.guidanceEvaluation.submittedAt ? String(bi.guidanceEvaluation.submittedAt).split("T")[0] : null,
                checklist: Array.isArray(bi.guidanceEvaluation.checklist) ? bi.guidanceEvaluation.checklist : [],
                ratings: bi.guidanceEvaluation.ratings && typeof bi.guidanceEvaluation.ratings === "object" ? bi.guidanceEvaluation.ratings : {},
                feedback: bi.guidanceEvaluation.feedback || "",
              }
            : undefined,
        };
      });
    }

    // 2. Client-side synthesis (demo accounts or fallback)
    const isEetu = user?.email === "eetu.makinen@metropolia.fi";

    if (isEetu) {
      return [
        {
          id: "internship-1",
          backendId: 1,
          order: 1,
          title: "Harjoittelu 1",
          scope: "h1",
          company: "Reaktor",
          targetHours: 400,
          loggedHours: 400,
          credits: 15,
          status: "completed",
          isLocked: false,
          startDate: "2025-05-05",
          endDate: "2025-08-29",
          supervisorName: "Antti Aallokas",
          supervisorRole: "Workplace supervisor",
          teacherName: "Mikko Laine",
          teacherRole: "Supervising teacher",
          isPlanApproved: true,
          isPlanSubmitted: true,
          isReportApproved: true,
          isReportSubmitted: true,
          isEvaluationSubmitted: true,
          isEvaluationLocked: false,
          creditsPutToOma: true,
          creditsPutToOmaAt: "2025-08-30T10:00:00.000Z",
          currentStepNumber: 6,
          plan: {
            status: "approved",
            submittedAt: "2025-04-20",
            approvedAt: "2025-04-24",
            teacherFeedback: "Approved by Mikko Laine: Suunnitelma hyväksytty. Tavoitteet selkeät ja tutkintovaatimusten mukaiset.",
            company: "Reaktor",
            jobTitle: "Junior Software Developer Trainee",
            supervisorName: "Antti Aallokas",
            supervisorContact: "antti.aallokas@reaktor.com",
            startDate: "2025-05-05",
            endDate: "2025-08-29",
            plannedHours: 400,
            hoursPerWeek: 37.5,
            jobDescription:
              "Työskentely osana ketterää mobiilikehitystiimiä Reaktorilla. Tehtäviin kuuluu asiakasprojektin käyttöliittymäkomponenttien kehittäminen React Native- ja TypeScript-teknologioilla, katselmointeihin osallistuminen ja automatisoitujen yksikkötestien kirjoittaminen Jest- ja React Native Testing Library -kirjastoilla.",
            learningGoals: [
              { id: "goal-1", text: "React Native- ja TypeScript-kehityksen syvällinen hallinta tuotantoympäristössä" },
              { id: "goal-2", text: "Ketterät ohjelmistokehitysmenetelmät, päivittäiset standupit ja koodikatselmointikäytännöt" },
              { id: "goal-3", text: "Mobiilikäyttöliittymien saavutettavuus ja automatisoitu komponenttitestaus" },
            ],
            assessment: "Viikoittaiset 1-on-1-ohjauskeskustelut työpaikkaohjaaja Antti Aallokkaan kanssa ja puolivälin arviointi kesäkuussa.",
          },
          report: {
            id: "report-1",
            status: "approved",
            submittedAt: "2025-08-28",
            approvedAt: "2025-08-30",
            totalHours: 400,
            tasksAndLearning:
              "Harjoittelu 1 Reaktorilla suoritettiin onnistuneesti toukokuun ja elokuun 2025 välisenä aikana. 400 tunnin tavoite saavutettiin täysimääräisesti. Tehtäviini kuului React Native -mobiilisovelluksen avaintoiminnallisuuksien toteuttaminen, tilanhallinnan refaktorointi ja kattavien automaatiotestien luominen. Opin erittäin paljon ketteristä menetelmistä sekä koodin laatuvaatimuksista ammattimaisessa kehitystiimissä. Työtodistus on liitteenä.",
            attachments: [
              { id: "att-1", name: "Tyotodistus_Reaktor.pdf", size: "1.2 MB", uploadedAt: "2025-08-28" },
            ],
            teacherFeedback: "Approved by Mikko Laine: Erinomainen raportti ja kattava kuvaus opituista asioista. Onnittelut ensimmäisen jakson suorittamisesta!",
          },
          evaluation: {
            status: "SUBMITTED",
            submittedAt: "2025-08-31T10:00:00Z",
            checklist: ["tavoitteet", "palaute", "perehdytys", "ohjausaika"],
            ratings: {
              tyopaikkaohjaus: 5,
              tehtavat_vastaavuus: 5,
              tyoyhteiso: 5,
              oppilaitos_ohjaus: 4,
              kokonaisarvio: 5,
            },
            feedback: "Harjoittelu Reaktorilla oli erittäin opettavainen ja ohjaus oli esimerkillistä. Tiimi tuki oppimista ja antoi säännöllistä palautetta.",
          },
        },
        {
          id: "internship-2",
          backendId: 2,
          order: 2,
          title: "Harjoittelu 2",
          scope: "h2",
          company: "Futurice",
          targetHours: 400,
          loggedHours: 400,
          credits: 15,
          status: "ongoing",
          isLocked: false,
          startDate: "2026-05-04",
          endDate: "2026-10-16",
          supervisorName: "Sami Salonen",
          supervisorRole: "Workplace supervisor",
          teacherName: "Mikko Laine",
          teacherRole: "Supervising teacher",
          isPlanApproved: true,
          isPlanSubmitted: true,
          isReportApproved: false,
          isReportSubmitted: false,
          isEvaluationSubmitted: false,
          isEvaluationLocked: true,
          creditsPutToOma: false,
          creditsPutToOmaAt: null,
          currentStepNumber: 4,
          plan: {
            status: "approved",
            submittedAt: "2026-04-25",
            approvedAt: "2026-04-28",
            teacherFeedback: "Approved by Mikko Laine: Harjoittelu 2 suunnitelma hyväksytty.",
            company: "Futurice",
            jobTitle: "Software Developer Intern",
            supervisorName: "Sami Salonen",
            supervisorContact: "sami.salonen@futurice.com",
            startDate: "2026-05-04",
            endDate: "2026-10-16",
            plannedHours: 400,
            hoursPerWeek: 37.5,
            jobDescription:
              "Toisen harjoittelujakson suorittaminen Futurice Oy:llä pilvipohjaisessa asiakasprojektissa. Tehtäviin kuuluu Node.js- ja TypeScript-taustajärjestelmien kehittäminen, AWS-pilvi-infrastruktuurin hyödyntäminen, Docker-kontitus sekä integraatioiden rakentaminen kolmannen osapuolen rajapintoihin ketterässä moniammatillisessa tiimissä.",
            learningGoals: [
              { id: "goal-1", text: "Pilviarkkitehtuurien (AWS Lambda, ECS, PostgreSQL) ja mikropalvelujen kehitysosaaminen" },
              { id: "goal-2", text: "CI/CD-automaatioputkien rakentaminen ja infrastruktuurin hallinta koodina (Terraform)" },
              { id: "goal-3", text: "Vaativien taustajärjestelmien suorituskyvyn monitorointi ja vikasietoisuuden parantaminen" },
            ],
            assessment: "Jatkuva palaute sprinttikatselmoinneissa ja viikoittaiset sparraukset Sami Salosen kanssa.",
          },
          report: {
            id: "report-draft-h2",
            status: "draft",
            totalHours: 400,
            tasksAndLearning: "",
            attachments: [],
          },
          evaluation: {
            status: "DRAFT",
          },
        },
      ];
    }

    // Default synthesis
    const company = user?.email?.includes("aino") ? "Nordic Pixel Oy" : "";

    if (currentScope === "combined") {
      return [
        {
          id: "internship-1",
          backendId: 1,
          order: 1,
          title: "Koko harjoittelu",
          scope: "combined",
          company,
          targetHours: 800,
          loggedHours: 0,
          credits: 30,
          status: "not_started",
          isLocked: false,
          startDate: "2026-05-04",
          endDate: "2026-10-30",
          supervisorName: "Teemu Tarkastaja",
          supervisorRole: "Workplace supervisor",
          teacherName: "Mikko Laine",
          teacherRole: "Supervising teacher",
          isPlanApproved: false,
          isPlanSubmitted: false,
          isReportApproved: false,
          isReportSubmitted: false,
          isEvaluationSubmitted: false,
          isEvaluationLocked: true,
        },
      ];
    }

    return [
      {
        id: "internship-1",
        backendId: 1,
        order: 1,
        title: "Harjoittelu 1",
        scope: "h1",
        company,
        targetHours: 400,
        loggedHours: 0,
        credits: 15,
        status: "not_started",
        isLocked: false,
        startDate: "2026-06-01",
        endDate: "2026-11-30",
        supervisorName: undefined,
        supervisorRole: "Workplace supervisor",
        teacherName: "Mikko Laine",
        teacherRole: "Supervising teacher",
        isPlanApproved: false,
        isPlanSubmitted: false,
        isReportApproved: false,
        isReportSubmitted: false,
        isEvaluationSubmitted: false,
        isEvaluationLocked: true,
      },
      {
        id: "internship-2",
        backendId: 2,
        order: 2,
        title: "Harjoittelu 2",
        scope: "h2",
        company: "",
        targetHours: 400,
        loggedHours: 0,
        credits: 15,
        status: "not_started",
        isLocked: true,
        supervisorName: undefined,
        supervisorRole: "Workplace supervisor",
        teacherName: "Mikko Laine",
        teacherRole: "Supervising teacher",
        isPlanApproved: false,
        isPlanSubmitted: false,
        isReportApproved: false,
        isReportSubmitted: false,
        isEvaluationSubmitted: false,
        isEvaluationLocked: true,
      },
    ];
  }, [backendInternships, user?.email, currentScope]);

  // Set default active internship when user switches, respecting any saved preference
  useEffect(() => {
    if (hasInitializedRef.current === user?.email) return;
    hasInitializedRef.current = user?.email || null;

    let saved: string | null = null;
    if (typeof window !== "undefined" && user?.email) {
      try {
        saved =
          window.sessionStorage.getItem(`harkkalogi_active_internship_${user.email}`) ||
          window.sessionStorage.getItem("harkkalogi_active_internship") ||
          window.localStorage.getItem(`harkkalogi_active_internship_${user.email}`) ||
          window.localStorage.getItem("harkkalogi_active_internship");
      } catch {
        // ignore
      }
    }

    if (saved && internships.some((i) => i.id === saved && !i.isLocked)) {
      setActiveInternshipIdState(saved);
      return;
    }

    const h2 = internships.find((i) => i.id === "internship-2");
    const h1 = internships.find((i) => i.id === "internship-1");
    if (h1 && h1.status === "completed" && h2 && !h2.isLocked) {
      setActiveInternshipIdState("internship-2");
    } else {
      setActiveInternshipIdState(internships[0]?.id || "internship-1");
    }
  }, [internships, user?.email]);

  const activeInternship = useMemo(() => {
    return internships.find((i) => i.id === activeInternshipId) || internships[0] || DEFAULT_INTERNSHIPS[0];
  }, [internships, activeInternshipId]);

  const targetHours = activeInternship.targetHours || (activeInternship.scope === "combined" ? 800 : 400);
  const isPlanApproved = Boolean(activeInternship.isPlanApproved);
  const isPlanSubmitted = Boolean(activeInternship.isPlanSubmitted || isPlanApproved);
  const isReportApproved = Boolean(activeInternship.isReportApproved);
  const isReportSubmitted = Boolean(activeInternship.isReportSubmitted || isReportApproved);
  const isEvaluationSubmitted = Boolean(activeInternship.isEvaluationSubmitted);
  const isEvaluationLocked = Boolean(activeInternship.isEvaluationLocked ?? !isReportApproved);

  const loggedHours = useMemo(() => {
    if (activeInternship.loggedHours !== undefined) {
      return activeInternship.loggedHours;
    }
    if (!isPlanApproved) return 0;
    if (isReportApproved || isReportSubmitted) return targetHours;
    return targetHours === 800 ? 640 : 320;
  }, [activeInternship.loggedHours, isPlanApproved, isReportApproved, isReportSubmitted, targetHours]);

  const remainingHours = Math.max(0, targetHours - loggedHours);

  const currentStepNumber = useMemo(() => {
    if (activeInternship.currentStepNumber !== undefined) {
      return activeInternship.currentStepNumber;
    }
    if (!isPlanSubmitted) return 1;
    if (!isPlanApproved) return 2;
    if (!isReportSubmitted) return loggedHours >= targetHours ? 4 : 3;
    if (!isReportApproved) return 5;
    return 6;
  }, [activeInternship.currentStepNumber, isPlanSubmitted, isPlanApproved, isReportSubmitted, isReportApproved, loggedHours, targetHours]);

  const contacts = useMemo<InternshipContact[]>(() => {
    if (activeInternship.contacts && activeInternship.contacts.length > 0) {
      return activeInternship.contacts;
    }

    const list: InternshipContact[] = [];

    // 1. Workplace supervisor: only included if actually set
    if (activeInternship.supervisorName && activeInternship.supervisorName.trim()) {
      list.push({
        name: activeInternship.supervisorName.trim(),
        role: activeInternship.supervisorRole || "Workplace supervisor",
      });
    }

    // 2. Supervising teacher
    if (activeInternship.teacherName && activeInternship.teacherName.trim()) {
      list.push({
        name: activeInternship.teacherName.trim(),
        role: activeInternship.teacherRole || "Supervising teacher",
      });
    } else {
      // Clear indication when teacher is not assigned
      list.push({
        name: "Not assigned",
        role: activeInternship.teacherRole || "Supervising teacher",
        isUnassigned: true,
      });
    }

    return list;
  }, [activeInternship]);

  const setScope = useCallback(
    (nextScope: "h1" | "h2" | "combined") => {
      setScopeState(nextScope);
    },
    []
  );

  const refreshInternships = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await apiFetch<{ internships: any[] }>("/internships");
      if (Array.isArray(data?.internships) && data.internships.length > 0) {
        setBackendInternships(data.internships);
      }
    } catch {
      // Ignore offline/error
    }
  }, [isAuthenticated]);

  const setCreditsPutToOma = useCallback(
    async (internshipId: number, value: boolean) => {
      try {
        await apiFetch(`/internships/${internshipId}/credits`, {
          method: "PATCH",
          body: JSON.stringify({ creditsPutToOma: value }),
        });
        await refreshInternships();
      } catch {
        // Ignore offline/error
      }
    },
    [refreshInternships]
  );

  const value = useMemo(
    () => ({
      internships,
      activeInternshipId,
      activeInternship,
      setActiveInternshipId,
      targetHours,
      loggedHours,
      remainingHours,
      isPlanApproved,
      isPlanSubmitted,
      isReportApproved,
      isReportSubmitted,
      isEvaluationSubmitted,
      isEvaluationLocked,
      creditsPutToOma: Boolean(activeInternship.creditsPutToOma),
      setCreditsPutToOma,
      currentStepNumber,
      scope: activeInternship.scope || currentScope,
      setScope,
      contacts,
      refreshInternships,
    }),
    [
      internships,
      activeInternshipId,
      activeInternship,
      targetHours,
      loggedHours,
      remainingHours,
      isPlanApproved,
      isPlanSubmitted,
      isReportApproved,
      isReportSubmitted,
      isEvaluationSubmitted,
      isEvaluationLocked,
      setCreditsPutToOma,
      currentStepNumber,
      currentScope,
      setScope,
      contacts,
      refreshInternships,
    ]
  );

  return (
    <InternshipContext.Provider value={value}>{children}</InternshipContext.Provider>
  );
}

export function useInternship(): InternshipContextType {
  const context = useContext(InternshipContext);
  if (!context) {
    throw new Error("useInternship must be used within an InternshipProvider");
  }
  return context;
}

