import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import StepStatusBanner, {
  resolveStepStatusBannerConfig,
} from "../../components/stepStatusBanner";

describe("StepStatusBanner: Config resolution and variants", () => {
  it("resolves review variant with info styles and submitted badge", () => {
    const config = resolveStepStatusBannerConfig({
      variant: "review",
      title: "Custom review title",
      description: "Custom description",
      badge: "In review",
    });

    assert.ok(config);
    assert.equal(config.variant, "review");
    assert.equal(config.title, "Custom review title");
    assert.equal(config.description, "Custom description");
    assert.equal(config.badge, "In review");
    assert.ok(config.containerClass.includes("bg-info-soft"));
    assert.ok(config.containerClass.includes("text-info"));
    assert.equal(config.badgeClass, "pill-info");
    assert.equal(config.dotClass, "bg-info");
  });

  it("resolves feedback / approved variant with success styles and teacher feedback", () => {
    const config = resolveStepStatusBannerConfig({
      variant: "feedback",
      title: "Plan approved by your teacher",
      feedback: "Great job on the learning objectives!",
      badge: "Approved",
    });

    assert.ok(config);
    assert.equal(config.variant, "feedback");
    assert.equal(config.title, "Plan approved by your teacher");
    assert.equal(config.feedback, "Great job on the learning objectives!");
    assert.equal(config.badge, "Approved");
    assert.ok(config.containerClass.includes("bg-success-soft"));
    assert.ok(config.containerClass.includes("text-success"));
    assert.equal(config.badgeClass, "pill-success");
    assert.equal(config.dotClass, "bg-success");
  });

  it("resolves changes_requested variant with danger styles", () => {
    const config = resolveStepStatusBannerConfig({
      status: "changes_requested",
      step: "report",
      feedback: "Please add more details about supervisor meetings.",
    });

    assert.ok(config);
    assert.equal(config.variant, "changes_requested");
    assert.equal(config.title, "Changes requested for your report");
    assert.equal(config.badge, "Changes requested");
    assert.equal(config.badgeClass, "pill-danger");
    assert.ok(config.containerClass.includes("bg-danger-soft"));
    assert.equal(config.dotClass, "bg-danger");
  });

  it("returns null for draft status (no banner in draft state)", () => {
    const config = resolveStepStatusBannerConfig({
      step: "plan",
      status: "draft",
    });

    assert.equal(config, null);
  });
});

describe("StepStatusBanner: Step presets", () => {
  describe("Plan step", () => {
    it("configures review banner correctly for submitted plan", () => {
      const config = resolveStepStatusBannerConfig({
        step: "plan",
        status: "submitted",
        submittedAt: "14.11.2026",
      });

      assert.ok(config);
      assert.equal(config.variant, "review");
      assert.equal(config.title, "Plan is waiting for teacher approval");
      assert.equal(
        config.description,
        "Submitted on 14.11.2026. You can still update your plan below."
      );
      assert.equal(config.badge, "Submitted");
      assert.equal(config.badgeClass, "pill-info");
    });

    it("configures approved banner with teacher feedback", () => {
      const config = resolveStepStatusBannerConfig({
        step: "plan",
        status: "approved",
        feedback: "Approved. You may start the internship.",
      });

      assert.ok(config);
      assert.equal(config.variant, "feedback");
      assert.equal(config.title, "Plan approved by your teacher");
      assert.equal(config.feedback, "Approved. You may start the internship.");
      assert.equal(config.badge, "Approved");
      assert.equal(config.badgeClass, "pill-success");
    });
  });

  describe("Report step", () => {
    it("configures review banner correctly for submitted report", () => {
      const config = resolveStepStatusBannerConfig({
        step: "report",
        status: "submitted",
        submittedAt: "10.11.2026",
      });

      assert.ok(config);
      assert.equal(config.variant, "review");
      assert.equal(config.title, "Report is under teacher review");
      assert.equal(
        config.description,
        "Submitted on 10.11.2026. You can still review your report details below."
      );
      assert.equal(config.badge, "Submitted");
      assert.equal(config.badgeClass, "pill-info");
    });

    it("configures approved banner with teacher name author", () => {
      const config = resolveStepStatusBannerConfig({
        step: "report",
        status: "approved",
        feedbackAuthor: "Mikko Laine",
        feedback: "Learning reflection and hours verified.",
      });

      assert.ok(config);
      assert.equal(config.variant, "feedback");
      assert.equal(config.title, "Report approved by Mikko Laine");
      assert.equal(config.feedback, "Learning reflection and hours verified.");
      assert.equal(config.badge, "Approved");
      assert.equal(config.badgeClass, "pill-success");
    });
  });

  describe("Evaluation step", () => {
    it("configures teacher review banner correctly", () => {
      const config = resolveStepStatusBannerConfig({
        step: "evaluation",
        variant: "review",
        title: "Ohjaavan opettajan näkymä (Read-only review)",
        description: "Tarkastelet opiskelijan täyttämää ohjauksen arviointia ja palautetta lukutilassa.",
        badge: "Teacher view",
      });

      assert.ok(config);
      assert.equal(config.variant, "review");
      assert.equal(config.title, "Ohjaavan opettajan näkymä (Read-only review)");
      assert.equal(config.badge, "Teacher view");
      assert.equal(config.badgeClass, "pill-info");
    });

    it("configures student ready / report approved banner correctly", () => {
      const config = resolveStepStatusBannerConfig({
        step: "evaluation",
        variant: "feedback",
        title: "Harjoitteluraportti hyväksytty · Lomake auki",
        description: "Harjoitteluraporttisi on hyväksytty. Voit nyt täyttää ja vahvistaa ohjauksen arvioinnin.",
        badge: "Ready for submission",
      });

      assert.ok(config);
      assert.equal(config.variant, "feedback");
      assert.equal(config.title, "Harjoitteluraportti hyväksytty · Lomake auki");
      assert.equal(config.badge, "Ready for submission");
      assert.equal(config.badgeClass, "pill-success");
    });
  });

  describe("Banner rendering without redundant state badge", () => {
    it("renders StepStatusBanner container without badge pill on the banner box", () => {
      const element = StepStatusBanner({
        step: "plan",
        status: "submitted",
        submittedAt: "14.11.2026",
      });

      assert.ok(React.isValidElement<any>(element));
      const children = React.Children.toArray(element.props.children);
      const headerRow = children[0] as React.ReactElement<any>;
      const headerRowChildren = React.Children.toArray(headerRow.props.children);

      // headerRowChildren should only contain the text/title column, no pill on the right
      assert.equal(headerRowChildren.length, 1);
      const textCol = headerRowChildren[0] as React.ReactElement<any>;
      assert.ok(textCol.props.className.includes("flex-col"));
    });
  });
});
