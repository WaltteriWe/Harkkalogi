import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { navByRole } from "../../components/sidebar";

describe("sidebar-nav: navByRole structure and process alignment", () => {
  it("defines student navigation in 3 logical groups following the process", () => {
    const studentGroups = navByRole.student;
    assert.equal(studentGroups.length, 3, "Student navigation should have 3 groups separated by dividers");

    // Group 0: Overview / Dashboard
    assert.deepEqual(studentGroups[0].items, [
      { label: "Overview", href: "/" },
    ]);

    // Group 1: The 3 adjacent chronological internship process stages
    assert.deepEqual(studentGroups[1].items, [
      { label: "Internship plan", href: "/planning" },
      { label: "Reports", href: "/reports" },
      { label: "Guidance evaluation", href: "/guidance-evaluation" },
    ]);

    // Group 2: Supporting resources and communication
    assert.deepEqual(studentGroups[2].items, [
      { label: "Documents", href: "/documents" },
      { label: "Messages", href: "/messages" },
    ]);
  });

  it("ensures all 6 student routes remain accessible for exploration", () => {
    const allStudentHrefs = navByRole.student.flatMap((g) => g.items.map((i) => i.href));
    assert.deepEqual(allStudentHrefs, [
      "/",
      "/planning",
      "/reports",
      "/guidance-evaluation",
      "/documents",
      "/messages",
    ]);
  });

  it("defines teacher and admin navigation groups correctly", () => {
    assert.equal(navByRole.teacher.length, 2);
    assert.deepEqual(navByRole.teacher[0].items, [
      { label: "Review queue", href: "/teacher-view" },
      { label: "My students", href: "/teacher-view/students" },
      { label: "Guidance evaluation", href: "/guidance-evaluation" },
    ]);
    assert.deepEqual(navByRole.teacher[1].items, [
      { label: "Messages", href: "/messages" },
    ]);

    assert.equal(navByRole.admin.length, 1);
    assert.deepEqual(navByRole.admin[0].items, [
      { label: "Overview", href: "/admin" },
      { label: "Users and roles", href: "/admin/users" },
      { label: "Programmes", href: "/admin/programmes" },
      { label: "Settings", href: "/admin/settings" },
    ]);
  });
});
