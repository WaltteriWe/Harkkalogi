import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";
import { Role, StudyType, InternshipStatus, InternshipStage, ReportStatus, ReviewDecision, PlanStatus } from "../generated/prisma/enums.ts";
import { hashPassword } from "../src/lib/password.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const defaultPassword = "password123";
  const passwordHash = await hashPassword(defaultPassword);

  const defaultUsers = [
    {
      email: "aino.korhonen@metropolia.fi",
      name: "Aino Korhonen",
      role: Role.STUDENT,
      studyType: StudyType.DAYTIME,
      passwordHash,
    },
    {
      email: "sara.niemi@metropolia.fi",
      name: "Sara Niemi",
      role: Role.STUDENT,
      studyType: StudyType.DAYTIME,
      passwordHash,
    },
    {
      email: "ville.virtanen@metropolia.fi",
      name: "Ville Virtanen",
      role: Role.STUDENT,
      studyType: StudyType.DAYTIME,
      passwordHash,
    },
    {
      email: "matias.koskinen@metropolia.fi",
      name: "Matias Koskinen",
      role: Role.STUDENT,
      studyType: StudyType.DAYTIME,
      passwordHash,
    },
    {
      email: "eetu.makinen@metropolia.fi",
      name: "Eetu Mäkinen",
      role: Role.STUDENT,
      studyType: StudyType.DAYTIME,
      passwordHash,
    },
    {
      email: "mikko.laine@metropolia.fi",
      name: "Mikko Laine",
      role: Role.TEACHER,
      passwordHash,
    },
    {
      email: "hanna.ope@metropolia.fi",
      name: "Hanna Opettaja",
      role: Role.TEACHER,
      passwordHash,
    },
    {
      email: "admin@metropolia.fi",
      name: "Admin User",
      role: Role.ADMIN,
      passwordHash,
    },
  ];

  const userMap = new Map<string, any>();

  for (const user of defaultUsers) {
    const upserted = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        studyType: user.studyType ?? null,
        passwordHash: user.passwordHash,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        studyType: user.studyType ?? null,
        passwordHash: user.passwordHash,
      },
    });

    userMap.set(upserted.email, upserted);
    console.log(`Seeded user: ${upserted.name} (${upserted.email}) [${upserted.role}]`);
  }

  const aino = userMap.get("aino.korhonen@metropolia.fi");
  const sara = userMap.get("sara.niemi@metropolia.fi");
  const mikko = userMap.get("mikko.laine@metropolia.fi");
  const ville = userMap.get("ville.virtanen@metropolia.fi");
  const matias = userMap.get("matias.koskinen@metropolia.fi");
  const eetu = userMap.get("eetu.makinen@metropolia.fi");

  // Seed Internship for Aino with Mikko as supervisor
  let ainoInternship = await prisma.internship.findFirst({
    where: { studentId: aino.id },
  });

  if (!ainoInternship) {
    ainoInternship = await prisma.internship.create({
      data: {
        title: "Koko harjoittelu",
        order: 1,
        credits: 30,
        requiredHours: 800,
        loggedHours: 640,
        stage: InternshipStage.IN_PROGRESS,
        company: "Nordic Pixel Oy",
        description: "Frontend developer internship focusing on React and Next.js portal development.",
        startDate: new Date("2026-06-01T08:00:00Z"),
        endDate: new Date("2026-11-30T16:00:00Z"),
        status: InternshipStatus.ONGOING,
        creditsPutToOma: false,
        creditsPutToOmaAt: null,
        studentId: aino.id,
        teacherId: mikko.id,
      },
    });
    console.log(`Seeded internship for Aino Korhonen with supervisor Mikko Laine`);
  } else {
    ainoInternship = await prisma.internship.update({
      where: { id: ainoInternship.id },
      data: {
        title: "Koko harjoittelu",
        order: 1,
        credits: 30,
        requiredHours: 800,
        loggedHours: 640,
        stage: InternshipStage.IN_PROGRESS,
        status: InternshipStatus.ONGOING,
        creditsPutToOma: false,
        creditsPutToOmaAt: null,
        teacherId: mikko.id,
        company: "Nordic Pixel Oy",
      },
    });
  }

  // Ensure Ville Virtanen has an internship with NO teacher assigned (unassigned supervisor testing)
  let villeInternship = await prisma.internship.findFirst({
    where: { studentId: ville.id },
  });

  if (!villeInternship) {
    await prisma.internship.create({
      data: {
        company: "Software Innovations Oy",
        description: "Full stack trainee internship.",
        startDate: new Date("2026-09-01T08:00:00Z"),
        status: InternshipStatus.ONGOING,
        stage: InternshipStage.PLAN_DRAFT,
        loggedHours: 0,
        studentId: ville.id,
        teacherId: null, // Explicitly unassigned!
      },
    });
    console.log(`Seeded unassigned internship for Ville Virtanen (teacherId: null)`);
  } else {
    await prisma.internship.update({
      where: { id: villeInternship.id },
      data: {
        teacherId: null,
        stage: InternshipStage.PLAN_DRAFT,
        loggedHours: 0,
        status: InternshipStatus.ONGOING,
      },
    });
  }

  // Seed fresh Step 1 Internship for Sara Niemi with Mikko Laine as supervising teacher
  if (sara) {
    // Reset Sara's data so re-running seed provides an idempotent clean slate
    await (prisma as any).guidanceEvaluation?.deleteMany({ where: { studentId: sara.id } });
    await prisma.report.deleteMany({
      where: { internship: { studentId: sara.id } },
    });
    await prisma.plan.deleteMany({ where: { studentId: sara.id } });

    let saraInternship = await prisma.internship.findFirst({
      where: { studentId: sara.id },
    });

    if (!saraInternship) {
      saraInternship = await prisma.internship.create({
        data: {
          title: "Harjoittelu 1",
          order: 1,
          credits: 15,
          requiredHours: 400,
          loggedHours: 0,
          stage: InternshipStage.PLAN_DRAFT,
          company: "",
          description: "Harjoittelu 1 (15 op)",
          startDate: new Date("2026-09-01T08:00:00Z"),
          status: InternshipStatus.ONGOING,
          creditsPutToOma: false,
          creditsPutToOmaAt: null,
          studentId: sara.id,
          teacherId: mikko.id,
        },
      });
      console.log(`Seeded fresh Step 1 internship for Sara Niemi with supervisor Mikko Laine`);
    } else {
      saraInternship = await prisma.internship.update({
        where: { id: saraInternship.id },
        data: {
          title: "Harjoittelu 1",
          order: 1,
          credits: 15,
          requiredHours: 400,
          loggedHours: 0,
          stage: InternshipStage.PLAN_DRAFT,
          company: "",
          teacherId: mikko.id,
          status: InternshipStatus.ONGOING,
          creditsPutToOma: false,
          creditsPutToOmaAt: null,
        },
      });
    }

    // Seed welcome guidance message from Mikko to Sara
    const existingSaraMsg = await prisma.message.findFirst({
      where: {
        senderId: mikko.id,
        recipientId: sara.id,
      },
    });

    if (!existingSaraMsg) {
      await prisma.message.create({
        data: {
          subject: "Tervetuloa harjoitteluun!",
          body: "Hei Sara,\n\nOlen nimetty harjoittelusi valvojaksi. Aloita täyttämällä harjoittelusuunnitelma suunnittelunäkymässä ja lähetä se minulle hyväksyttäväksi ennen harjoittelun alkua.\n\nTerveisin,\nMikko Laine",
          read: false,
          senderId: mikko.id,
          recipientId: sara.id,
          internshipId: saraInternship.id,
          parentId: null,
        },
      });
      console.log("Seeded welcome message from Mikko Laine to Sara Niemi");
    }
  }

  // Seed initial conversation messages between Mikko and Aino
  const existingThread = await prisma.message.findFirst({
    where: {
      subject: "Feedback on your internship agreement",
      senderId: mikko.id,
      recipientId: aino.id,
    },
  });

  if (!existingThread) {
    const thread1 = await prisma.message.create({
      data: {
        subject: "Feedback on your internship agreement",
        body: "Hi Aino,\n\nI have reviewed your internship agreement with Nordic Pixel Oy. The learning goals are clearly aligned with the curriculum.\n\nKeep logging your hours and feel free to reach out if you have questions regarding the final reporting deadline in December.\n\nBest regards,\nMikko Laine",
        read: false,
        senderId: mikko.id,
        recipientId: aino.id,
        internshipId: ainoInternship.id,
        parentId: null,
        createdAt: new Date(Date.now() - 3600000 * 4), // 4 hours ago
        attachments: {
          create: [
            {
              name: "Harjoittelusopimus_hyvaksytty.pdf",
              size: "1.2 MB",
              fileUrl: "/documents/Harjoittelusopimus_hyvaksytty.pdf",
              mimeType: "application/pdf",
            },
          ],
        },
      },
    });

    await prisma.message.create({
      data: {
        parentId: thread1.id,
        senderId: aino.id,
        recipientId: mikko.id,
        body: "Thank you Mikko! I will keep logging my hours regularly.",
        read: true,
        createdAt: new Date(Date.now() - 3600000 * 2), // 2 hours ago
      },
    });

    await prisma.message.create({
      data: {
        subject: "Reminder: Final report due on 15.12.",
        body: "Hello students,\n\nThis is a general reminder regarding the final report requirements. Please make sure that your 800 hours are logged and supervisor evaluations uploaded.\n\nBest,\nMikko Laine",
        read: true,
        senderId: mikko.id,
        recipientId: aino.id,
        internshipId: ainoInternship.id,
        parentId: null,
        createdAt: new Date(Date.now() - 86400000 * 3), // 3 days ago
      },
    });

    console.log("Seeded sample message threads between Mikko Laine and Aino Korhonen");
  }

  // Seed sample Report for Aino's internship
  const existingReport = await prisma.report.findFirst({
    where: { internshipId: ainoInternship.id },
  });

  if (!existingReport) {
    await prisma.report.create({
      data: {
        title: "Ensimmäisen kuukauden väliraportti",
        realizedHours: 120,
        generalSummary: "Olen tutustunut tiimiin ja perehtynyt Next.js- ja React-teknologioihin. Työtehtävät ovat edenneet tavoitteiden mukaisesti.",
        goalReflections: [
          {
            goalId: "goal-1",
            goalText: "Next.js ja TypeScript hallinta",
            reflection: "Olen oppinut hyödyntämään Next.js App Routeria ja TypeScript-tyypitystä käytännön tiimityössä.",
            status: "ACHIEVED",
          },
        ],
        attachments: [],
        status: ReportStatus.SUBMITTED,
        submittedAt: new Date(Date.now() - 86400000 * 7),
        internshipId: ainoInternship.id,
        reviews: {
          create: [
            {
              comment: "Erinomaista edistymistä! Jatka samaan malliin.",
              decision: ReviewDecision.APPROVED,
              teacherId: mikko.id,
            },
          ],
        },
      },
    });
    console.log("Seeded sample report for Aino Korhonen");
  }

  // Seed sample Plan for Aino's internship
  const existingPlan = await prisma.plan.findFirst({
    where: { studentId: aino.id },
  });

  if (!existingPlan) {
    await prisma.plan.create({
      data: {
        scope: "combined",
        company: "Nordic Pixel Oy",
        jobTitle: "Frontend Developer Trainee",
        supervisorName: "Laura Nieminen",
        supervisorContact: "laura.nieminen@nordicpixel.fi",
        startDate: new Date("2026-06-01T08:00:00Z"),
        endDate: new Date("2026-11-30T16:00:00Z"),
        plannedHours: 800,
        hoursPerWeek: 37.5,
        jobDescription:
          "Developing user interface components in React and TypeScript for customer-facing web applications. Collaborating in sprint reviews, writing automated component tests, and maintaining design system tokens with senior developers.",
        learningGoals: [
          { id: "goal-1", text: "Learn to build accessible UI components with React and TypeScript" },
          { id: "goal-2", text: "Gain experience with Git workflows and pull request reviews in an agile team" },
          { id: "goal-3", text: "Write unit and component tests with modern testing frameworks" },
        ],
        assessment: "Weekly 1-on-1 check-ins with supervisor Laura Nieminen, and mid-term evaluation in August.",
        status: PlanStatus.APPROVED,
        submittedAt: new Date("2026-05-12T10:00:00Z"),
        approvedAt: new Date("2026-05-15T14:30:00Z"),
        teacherFeedback: "Approved by Mikko Laine: Well-structured goals clearly tied to the curriculum.",
        studentId: aino.id,
        internshipId: ainoInternship.id,
      },
    });
    console.log("Seeded sample plan for Aino Korhonen");
  }

  // Seed guidance-evaluation phase student: Matias Koskinen
  // Status: Plan approved, Final report submitted and approved by Mikko Laine, Guidance evaluation unlocked/ready
  if (matias) {
    // Clean up any prior evaluations, reports, plans for idempotent re-seeding
    await (prisma as any).guidanceEvaluation?.deleteMany({ where: { studentId: matias.id } });
    await prisma.report.deleteMany({
      where: { internship: { studentId: matias.id } },
    });
    await prisma.plan.deleteMany({ where: { studentId: matias.id } });

    let matiasInternship = await prisma.internship.findFirst({
      where: { studentId: matias.id },
    });

    if (!matiasInternship) {
      matiasInternship = await prisma.internship.create({
        data: {
          title: "Koko harjoittelu",
          order: 1,
          credits: 30,
          requiredHours: 800,
          loggedHours: 800,
          stage: InternshipStage.EVALUATION_PENDING,
          company: "DigiSolutions Finland Oy",
          description: "Full stack web development internship focusing on React, TypeScript, and Node.js REST APIs (30 op / 800 h).",
          startDate: new Date("2026-05-04T08:00:00Z"),
          endDate: new Date("2026-10-30T16:00:00Z"),
          status: InternshipStatus.ONGOING,
          creditsPutToOma: true,
          creditsPutToOmaAt: new Date("2026-10-28T10:00:00Z"),
          studentId: matias.id,
          teacherId: mikko.id,
        },
      });
      console.log(`Seeded internship for Matias Koskinen with supervisor Mikko Laine`);
    } else {
      matiasInternship = await prisma.internship.update({
        where: { id: matiasInternship.id },
        data: {
          title: "Koko harjoittelu",
          order: 1,
          credits: 30,
          requiredHours: 800,
          loggedHours: 800,
          stage: InternshipStage.EVALUATION_PENDING,
          company: "DigiSolutions Finland Oy",
          description: "Full stack web development internship focusing on React, TypeScript, and Node.js REST APIs (30 op / 800 h).",
          startDate: new Date("2026-05-04T08:00:00Z"),
          endDate: new Date("2026-10-30T16:00:00Z"),
          teacherId: mikko.id,
          status: InternshipStatus.ONGOING,
          creditsPutToOma: true,
          creditsPutToOmaAt: new Date("2026-10-28T10:00:00Z"),
        },
      });
    }

    // Seed approved plan for Matias Koskinen (800 h combined)
    await prisma.plan.create({
      data: {
        scope: "combined",
        company: "DigiSolutions Finland Oy",
        jobTitle: "Junior Software Developer Trainee",
        supervisorName: "Teemu Tarkastaja",
        supervisorContact: "teemu.tarkastaja@digisolutions.fi",
        startDate: new Date("2026-05-04T08:00:00Z"),
        endDate: new Date("2026-10-30T16:00:00Z"),
        plannedHours: 800,
        hoursPerWeek: 37.5,
        jobDescription:
          "Developing full stack web features using TypeScript, React, and Express. Building RESTful endpoints, maintaining automated tests, and collaborating with senior developers in daily standups and sprint planning.",
        learningGoals: [
          { id: "goal-1", text: "Master full-stack TypeScript and REST API development" },
          { id: "goal-2", text: "Learn relational database design and PostgreSQL schema migrations" },
          { id: "goal-3", text: "Gain experience with CI/CD pipelines and automated integration testing" },
        ],
        assessment: "Weekly 1-on-1 feedback discussions with workplace supervisor Teemu Tarkastaja and bi-weekly sprint reviews.",
        status: PlanStatus.APPROVED,
        submittedAt: new Date("2026-05-02T09:00:00Z"),
        approvedAt: new Date("2026-05-05T13:00:00Z"),
        teacherFeedback: "Approved by Mikko Laine: Well-structured learning goals clearly aligned with degree requirements.",
        studentId: matias.id,
        internshipId: matiasInternship.id,
      },
    });
    console.log("Seeded approved plan for Matias Koskinen");

    // Seed final report with approved review decision from supervising teacher Mikko Laine (800 h)
    await prisma.report.create({
      data: {
        title: "Harjoittelun loppuraportti (800 h)",
        realizedHours: 800,
        generalSummary:
          "Koko harjoittelujakso DigiSolutions Finland Oy:ssä on saatu menestyksekkäästi päätökseen. Suoritin vaaditut 800 työtuntia täysipäiväisesti toukokuun ja lokakuun 2026 välisenä aikana. Keskeisiin työtehtäviini kuului asiakasportaalin REST-rajapintojen ja React-käyttöliittymäkomponenttien kehittäminen sekä PostgreSQL-tietokantakyselyiden optimointi. Kaikki harjoittelusuunnitelmassa asetetut oppimistavoitteet saavutettiin kiitettävästi. Työtodistus ja tuntierittely on toimitettu ohjaavalle opettajalle.",
        goalReflections: [
          {
            goalId: "goal-1",
            goalText: "Master full-stack TypeScript and REST API development",
            reflection: "Kehitin tuotantotasoisia REST-rajapintoja ja React-käyttöliittymiä TypeScriptillä.",
            status: "ACHIEVED",
          },
          {
            goalId: "goal-2",
            goalText: "Learn relational database design and PostgreSQL schema migrations",
            reflection: "Suunnittelin tietokantaskeemoja ja optimoin PostgreSQL-tietokantakyselyitä.",
            status: "ACHIEVED",
          },
          {
            goalId: "goal-3",
            goalText: "Gain experience with CI/CD pipelines and automated integration testing",
            reflection: "Toteutin kattavat yksikkö- ja integraatiotestit avainpalveluille osana CI/CD-putkea.",
            status: "ACHIEVED",
          },
        ],
        attachments: [
          {
            id: "att-matias-1",
            name: "Tyotodistus_DigiSolutions_Matias.pdf",
            status: "Uploaded",
            size: "1.4 MB",
          },
        ],
        status: ReportStatus.REVIEWED,
        submittedAt: new Date("2026-10-25T14:00:00Z"),
        approvedAt: new Date("2026-10-28T10:00:00Z"),
        internshipId: matiasInternship.id,
        reviews: {
          create: [
            {
              comment:
                "Loppuraportti ja työtodistus tarkistettu ja hyväksytty. 30 opintopisteen suoritusmerkintä siirretty OMAan. Muistathan täyttää vielä harjoittelun ohjauksen arvioinnin suoritusprosessin viimeistelemiseksi.",
              decision: ReviewDecision.APPROVED,
              teacherId: mikko.id,
              createdAt: new Date("2026-10-28T10:00:00Z"),
            },
          ],
        },
      },
    });
    console.log("Seeded approved final report for Matias Koskinen");

    // Seed message from Mikko Laine to Matias reminding about guidance evaluation
    const existingMatiasMsg = await prisma.message.findFirst({
      where: {
        senderId: mikko.id,
        recipientId: matias.id,
      },
    });

    if (!existingMatiasMsg) {
      await prisma.message.create({
        data: {
          subject: "Koko harjoittelu hyväksytty — Muistathan ohjauksen arvioinnin",
          body: "Hei Matias,\n\nHarjoittelusi loppuraportti ja työtodistuksesi on hyväksytty ja 30 op (800 h) suoritusmerkintä on viety opintotietojärjestelmään. Lämpimät onnittelut hienosti sujuneesta harjoittelusta!\n\nKäythän vielä täyttämässä harjoittelun ohjauksen arvioinnin (vaihe 6) järjestelmässä. Palautteesi on meille erittäin tärkeää harjoittelupaikkojen ja ohjauksen kehittämisessä.\n\nTerveisin,\nMikko Laine\nOhjaava opettaja",
          read: false,
          senderId: mikko.id,
          recipientId: matias.id,
          internshipId: matiasInternship.id,
          parentId: null,
          createdAt: new Date("2026-10-28T10:15:00Z"),
        },
      });
      console.log("Seeded guidance evaluation reminder message for Matias Koskinen");
    }
  }

  // Seed multi-internship student: Eetu Mäkinen
  // Status:
  // - Harjoittelu 1: 15 op (400 h) at Reaktor COMPLETED, plan approved, report approved by Mikko Laine
  // - Harjoittelu 2: 15 op (400 h) at Futurice ONGOING, period ended (time elapsed), plan approved, report ready to be written
  if (eetu) {
    await (prisma as any).guidanceEvaluation?.deleteMany({ where: { studentId: eetu.id } });
    await prisma.review.deleteMany({
      where: { report: { internship: { studentId: eetu.id } } },
    });
    await prisma.report.deleteMany({
      where: { internship: { studentId: eetu.id } },
    });
    await prisma.plan.deleteMany({ where: { studentId: eetu.id } });
    await prisma.messageAttachment.deleteMany({
      where: { message: { OR: [{ senderId: eetu.id }, { recipientId: eetu.id }] } },
    });
    await prisma.message.deleteMany({
      where: { OR: [{ senderId: eetu.id }, { recipientId: eetu.id }] },
    });
    await prisma.internship.deleteMany({
      where: { studentId: eetu.id },
    });

    // 1. Harjoittelu 1 (Completed, 15 op, 400 h, Reaktor)
    const eetuH1 = await prisma.internship.create({
      data: {
        title: "Harjoittelu 1",
        order: 1,
        credits: 15,
        requiredHours: 400,
        loggedHours: 400,
        stage: InternshipStage.COMPLETED,
        company: "Reaktor",
        description: "Harjoittelu 1 (15 op) - Frontend- ja mobiilisovelluskehitys.",
        startDate: new Date("2025-05-05T08:00:00Z"),
        endDate: new Date("2025-08-29T16:00:00Z"),
        status: InternshipStatus.COMPLETED,
        creditsPutToOma: true,
        creditsPutToOmaAt: new Date("2025-08-30T10:00:00Z"),
        studentId: eetu.id,
        teacherId: mikko.id,
      },
    });

    // Plan for H1 (Approved)
    await prisma.plan.create({
      data: {
        scope: "h1",
        company: "Reaktor",
        jobTitle: "Junior Software Developer Trainee",
        supervisorName: "Antti Aallokas",
        supervisorContact: "antti.aallokas@reaktor.com",
        startDate: new Date("2025-05-05T08:00:00Z"),
        endDate: new Date("2025-08-29T16:00:00Z"),
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
        status: PlanStatus.APPROVED,
        submittedAt: new Date("2025-04-20T10:00:00Z"),
        approvedAt: new Date("2025-04-24T14:00:00Z"),
        teacherFeedback: "Approved by Mikko Laine: Suunnitelma hyväksytty. Tavoitteet selkeät ja tutkintovaatimusten mukaiset.",
        studentId: eetu.id,
        internshipId: eetuH1.id,
      },
    });

    // Report for H1 (Reviewed & Approved by Mikko Laine)
    await prisma.report.create({
      data: {
        title: "Harjoittelu 1 loppuraportti (400 h)",
        realizedHours: 400,
        generalSummary:
          "Harjoittelu 1 Reaktorilla suoritettiin onnistuneesti toukokuun ja elokuun 2025 välisenä aikana. 400 tunnin tavoite saavutettiin täysimääräisesti. Tehtäviini kuului React Native -mobiilisovelluksen avaintoiminnallisuuksien toteuttaminen, tilanhallinnan refaktorointi ja kattavien automaatiotestien luominen. Opin erittäin paljon ketteristä menetelmistä sekä koodin laatuvaatimuksista ammattimaisessa kehitystiimissä. Työtodistus on liitteenä.",
        goalReflections: [
          {
            goalId: "eetu-goal-1",
            goalText: "Mobiilikehitysosaaminen React Nativella",
            reflection: "Toteutin mobiilikäyttöliittymät ja tilanhallintaputket onnistuneesti tuotantoon.",
            status: "ACHIEVED",
          },
          {
            goalId: "eetu-goal-2",
            goalText: "Automaatiotestaus",
            reflection: "Kirjoitin Jest- ja Detox-testejä kattamaan kriittiset käyttäjäpolut.",
            status: "ACHIEVED",
          },
        ],
        attachments: [
          {
            id: "att-eetu-h1-1",
            name: "Tyotodistus_Reaktor_Eetu_Makinen.pdf",
            status: "Uploaded",
            size: "1.1 MB",
            fileUrl: "/documents/Tyotodistus_Reaktor_Eetu_Makinen.pdf",
            mimeType: "application/pdf",
          },
        ],
        status: ReportStatus.REVIEWED,
        submittedAt: new Date("2025-08-28T12:00:00Z"),
        approvedAt: new Date("2025-08-30T09:00:00Z"),
        internshipId: eetuH1.id,
        reviews: {
          create: [
            {
              comment:
                "Harjoittelu 1 loppuraportti ja työtodistus tarkistettu ja hyväksytty. 15 opintopisteen suoritusmerkintä siirretty OMAan. Onnittelut ensimmäisen jakson suorittamisesta!",
              decision: ReviewDecision.APPROVED,
              teacherId: mikko.id,
              createdAt: new Date("2025-08-30T09:00:00Z"),
            },
          ],
        },
      },
    });

    // Guidance evaluation for H1 (Submitted & Completed)
    await prisma.guidanceEvaluation.create({
      data: {
        internshipId: eetuH1.id,
        studentId: eetu.id,
        status: "SUBMITTED",
        checklist: ["tavoitteet", "palaute", "tehtavat", "ohjaus"],
        ratings: {
          tyopaikkaohjaus: 5,
          tehtavat_vastaavuus: 5,
          tyoyhteiso: 5,
          oppilaitos_ohjaus: 4,
          kokonaisarvio: 5,
        },
        feedback:
          "Harjoittelu Reaktorilla oli erittäin opettavainen ja ohjaus oli esimerkillistä. Tiimi tuki oppimista ja antoi säännöllistä palautetta.",
        submittedAt: new Date("2025-08-31T10:00:00Z"),
      },
    });

    // 2. Harjoittelu 2 (Ongoing, time passed: May-Oct 2026, 400 h, Futurice)
    const eetuH2 = await prisma.internship.create({
      data: {
        title: "Harjoittelu 2",
        order: 2,
        credits: 15,
        requiredHours: 400,
        loggedHours: 400,
        stage: InternshipStage.REPORT_READY,
        company: "Futurice",
        description: "Harjoittelu 2 (15 op) - Full stack -pilvipalvelut ja mikropalveluarkkitehtuuri.",
        startDate: new Date("2026-05-04T08:00:00Z"),
        endDate: new Date("2026-10-16T16:00:00Z"),
        status: InternshipStatus.ONGOING,
        creditsPutToOma: false,
        creditsPutToOmaAt: null,
        studentId: eetu.id,
        teacherId: mikko.id,
      },
    });

    // Plan for H2 (Approved so student is ready to report!)
    await prisma.plan.create({
      data: {
        scope: "h2",
        company: "Futurice",
        jobTitle: "Software Developer Intern",
        supervisorName: "Sami Salonen",
        supervisorContact: "sami.salonen@futurice.com",
        startDate: new Date("2026-05-04T08:00:00Z"),
        endDate: new Date("2026-10-16T16:00:00Z"),
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
        status: PlanStatus.APPROVED,
        submittedAt: new Date("2026-04-25T11:00:00Z"),
        approvedAt: new Date("2026-04-28T15:00:00Z"),
        teacherFeedback: "Approved by Mikko Laine: Harjoittelu 2 suunnitelma hyväksytty. Tavoitteet erittäin hyvät.",
        studentId: eetu.id,
        internshipId: eetuH2.id,
      },
    });

    // Seed message from Mikko Laine to Eetu
    await prisma.message.create({
      data: {
        subject: "Harjoittelu 2 jakso päättynyt — Muistathan loppuraportin ja työtodistuksen",
        body: "Hei Eetu,\n\nHarjoittelu 2 työskentelyaikasi Futurice Oy:ssä on päättynyt ja 400 tuntia on täyttynyt. Voit nyt täyttää ja palauttaa harjoitteluraportin sekä liittää mukaan työtodistuksen tarkistusta varten raportointinäkymässä.\n\nTerveisin,\nMikko Laine\nOhjaava opettaja",
        read: false,
        senderId: mikko.id,
        recipientId: eetu.id,
        internshipId: eetuH2.id,
        parentId: null,
        createdAt: new Date("2026-10-17T09:00:00Z"),
      },
    });

    console.log("Seeded multi-internship student Eetu Mäkinen (H1 completed, H2 ready for report)");
  }

  console.log("Database seed completed successfully.");
}

main()
  .catch((e) => {
    console.error("Error seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
