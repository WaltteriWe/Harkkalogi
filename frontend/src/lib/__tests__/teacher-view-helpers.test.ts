import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  mapStudyType,
  deriveStudentReportStatus,
  filterSupervisedStudents,
  type SupervisedStudent,
} from "../teacher-view-helpers";

describe("teacher-view-helpers", () => {
  describe("mapStudyType", () => {
    it("maps DAYTIME, MULTIFORM, and null/unknown", () => {
      assert.equal(mapStudyType("DAYTIME"), "päivätoteutus");
      assert.equal(mapStudyType("MULTIFORM"), "monimuoto");
      assert.equal(mapStudyType(null), "unspecified");
      assert.equal(mapStudyType(undefined), "unspecified");
    });
  });

  describe("deriveStudentReportStatus", () => {
    it("returns in_progress when there are no reports", () => {
      assert.equal(deriveStudentReportStatus([]), "in_progress");
      assert.equal(deriveStudentReportStatus(null), "in_progress");
    });

    it("returns approved when latest report is REVIEWED", () => {
      assert.equal(
        deriveStudentReportStatus([{ id: 1, status: "REVIEWED" }]),
        "approved"
      );
    });

    it("returns needs_review when latest report is SUBMITTED", () => {
      assert.equal(
        deriveStudentReportStatus([{ id: 1, status: "SUBMITTED" }]),
        "needs_review"
      );
    });

    it("returns changes_requested when latest report is DRAFT with NEEDS_CHANGES review", () => {
      assert.equal(
        deriveStudentReportStatus([
          {
            id: 1,
            status: "DRAFT",
            reviews: [{ decision: "NEEDS_CHANGES", comment: "Fix it" }],
          },
        ]),
        "changes_requested"
      );
    });

    it("returns in_progress for plain DRAFT without NEEDS_CHANGES review", () => {
      assert.equal(
        deriveStudentReportStatus([{ id: 1, status: "DRAFT", reviews: [] }]),
        "in_progress"
      );
    });
  });

  describe("filterSupervisedStudents", () => {
    const sample: SupervisedStudent[] = [
      {
        id: "1",
        internshipId: 1,
        internshipTitle: "Harjoittelu 1",
        name: "Aino Korhonen",
        email: "aino@metropolia.fi",
        studyMode: "päivätoteutus",
        company: "Nordic Pixel",
        hoursLogged: 400,
        hoursRequired: 400,
        credits: 15,
        reportStatus: "needs_review",
        creditsPutToOma: false,
      },
      {
        id: "2",
        internshipId: 2,
        internshipTitle: "Harjoittelu 2",
        name: "Linnea Berg",
        email: "linnea@metropolia.fi",
        studyMode: "monimuoto",
        company: "Reaktor",
        hoursLogged: 800,
        hoursRequired: 800,
        credits: 30,
        reportStatus: "needs_review",
        creditsPutToOma: false,
      },
      {
        id: "3",
        internshipId: 3,
        internshipTitle: "Harjoittelu 1",
        name: "Oskari Nurmi",
        email: "oskari@metropolia.fi",
        studyMode: "monimuoto",
        company: "Wolt",
        hoursLogged: 200,
        hoursRequired: 400,
        credits: 15,
        reportStatus: "in_progress",
        creditsPutToOma: false,
      },
    ];

    it("combines studyTypeFilter, statusFilter, and searchQuery with AND", () => {
      const result = filterSupervisedStudents(sample, {
        studyTypeFilter: "monimuoto",
        statusFilter: "needs_review",
        searchQuery: "reaktor",
      });
      assert.equal(result.length, 1);
      assert.equal(result[0].name, "Linnea Berg");
    });

    it("returns all items when filters are all and search is empty", () => {
      const result = filterSupervisedStudents(sample, {
        studyTypeFilter: "all",
        statusFilter: "all",
        searchQuery: "",
      });
      assert.equal(result.length, 3);
    });
  });
});
