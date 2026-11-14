import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import ProcessPageHeader, {
  getStatusPill,
} from "../../components/processPageHeader";

describe("ProcessPageHeader: getStatusPill resolution", () => {
  it("resolves approved status to pill-success", () => {
    const pill = getStatusPill("approved");
    assert.ok(React.isValidElement<any>(pill));
    assert.equal(pill.props.className, "pill-success text-sm px-3 py-1");
    assert.equal(pill.props.children, "Approved");
  });

  it("resolves submitted status to pill-info", () => {
    const pill = getStatusPill("submitted");
    assert.ok(React.isValidElement<any>(pill));
    assert.equal(pill.props.className, "pill-info text-sm px-3 py-1");
    assert.equal(pill.props.children, "Submitted");
  });

  it("resolves draft status to pill-neutral", () => {
    const pill = getStatusPill("draft");
    assert.ok(React.isValidElement<any>(pill));
    assert.equal(pill.props.className, "pill-neutral text-sm px-3 py-1");
    assert.equal(pill.props.children, "Draft");
  });

  it("resolves changes_requested status to pill-danger", () => {
    const pill = getStatusPill("changes_requested");
    assert.ok(React.isValidElement<any>(pill));
    assert.equal(pill.props.className, "pill-danger text-sm px-3 py-1");
    assert.equal(pill.props.children, "Changes requested");
  });

  it("prioritizes custom statusBadge over standard status", () => {
    const custom = React.createElement("span", { className: "custom-pill" }, "Teacher view");
    const pill = getStatusPill("approved", custom);
    assert.equal(pill, custom);
  });

  it("converts string customBadge to pill-neutral", () => {
    const pill = getStatusPill(undefined, "Step 6 of 6 · Guidance evaluation");
    assert.ok(React.isValidElement<any>(pill));
    assert.equal(pill.props.className, "pill-neutral text-sm px-3 py-1");
    assert.equal(pill.props.children, "Step 6 of 6 · Guidance evaluation");
  });

  it("returns null when no status or badge is provided", () => {
    assert.equal(getStatusPill(undefined, undefined), null);
  });
});

describe("ProcessPageHeader: Component element structure", () => {
  it("renders back link with default href and label", () => {
    const element = ProcessPageHeader({
      title: "Internship plan",
      status: "draft",
    });

    assert.ok(React.isValidElement<any>(element));
    const children = React.Children.toArray(element.props.children);

    // Link is the first child
    const link = children[0] as React.ReactElement<any>;
    assert.equal(link.props.href, "/");
    assert.equal(link.props.children, "← Back to overview");
  });

  it("supports custom backHref and backLabel", () => {
    const element = ProcessPageHeader({
      title: "Harjoittelun ohjauksen arviointi",
      backHref: "/teacher-view",
      backLabel: "← Back to teacher view",
      statusBadge: React.createElement("span", { className: "pill-info" }, "Teacher view"),
    });

    assert.ok(React.isValidElement<any>(element));
    const children = React.Children.toArray(element.props.children);
    const link = children[0] as React.ReactElement<any>;
    assert.equal(link.props.href, "/teacher-view");
    assert.equal(link.props.children, "← Back to teacher view");
  });

  it("renders title and status pill in title row", () => {
    const element = ProcessPageHeader({
      title: "Final internship report",
      status: "approved",
      subtitle: "Approved on 14.11.2026",
    });

    assert.ok(React.isValidElement<any>(element));
    const children = React.Children.toArray(element.props.children);

    // Title row is second child
    const titleRow = children[1] as React.ReactElement<any>;
    const titleRowChildren = React.Children.toArray(titleRow.props.children);
    const h1 = titleRowChildren[0] as React.ReactElement<any>;
    assert.equal(h1.props.children, "Final internship report");

    // Subtitle is third child
    const subtitle = children[2] as React.ReactElement<any>;
    assert.equal(subtitle.props.children, "Approved on 14.11.2026");
    assert.ok(subtitle.props.className.includes("meta"));
  });
});
