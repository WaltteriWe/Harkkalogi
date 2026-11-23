import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { CollapsiblePlanSection } from "../../components/collapsiblePlanSection";

describe("CollapsiblePlanSection component structure and behavior", () => {
  it("renders in expanded state with title, subtitle, and children", () => {
    let toggled = false;
    const element = CollapsiblePlanSection({
      id: "test-section-1",
      title: "1. Opiskelijan tiedot",
      subtitle: "Tiedot noudettu käyttäjäprofiilista",
      isComplete: true,
      isCollapsed: false,
      onToggle: () => {
        toggled = true;
      },
      children: React.createElement("div", { id: "child-content" }, "Hello form"),
    });

    assert.ok(React.isValidElement<any>(element));
    assert.equal(element.type, "section");
    assert.equal(element.props.id, "test-section-1");
    assert.equal(element.props["aria-expanded"], true);
    assert.ok(element.props.className.includes("flex flex-col"));

    // Find the header button ("Tiivistä")
    const headerDiv = element.props.children[0];
    const button = headerDiv.props.children[1];
    assert.equal(button.type, "button");
    assert.ok(button.props["aria-label"].includes("Tiivistä"));

    // Test toggle click
    button.props.onClick();
    assert.equal(toggled, true);

    // Verify children container exists
    const bodyDiv = element.props.children[1];
    assert.equal(bodyDiv.props.id, "test-section-1-content");
    assert.equal(bodyDiv.props.children.props.id, "child-content");
  });

  it("renders in collapsed state with Muokkaa button, preview, and omitted children", () => {
    let toggled = false;
    const element = CollapsiblePlanSection({
      id: "test-section-2",
      title: "2. Työnantajan tiedot",
      isComplete: false,
      summaryPreview: "Nordic Pixel Oy · Helsinki",
      isCollapsed: true,
      onToggle: () => {
        toggled = true;
      },
      children: React.createElement("div", { id: "child-content" }, "Hidden inputs"),
    });

    assert.ok(React.isValidElement<any>(element));
    assert.equal(element.type, "section");
    assert.equal(element.props["aria-expanded"], false);
    assert.equal(element.props.tabIndex, 0);
    assert.ok(element.props.className.includes("cursor-pointer"));

    // Card click triggers toggle
    element.props.onClick();
    assert.equal(toggled, true);

    // Button is "Muokkaa"
    const headerDiv = element.props.children[0];
    const button = headerDiv.props.children[1];
    assert.equal(button.type, "button");
    assert.ok(button.props["aria-label"].includes("Avaa"));

    // Status badge defaults to "Keskeneräinen" when isComplete is false
    const badgeWrapper = headerDiv.props.children[0].props.children[1];
    assert.equal(badgeWrapper.props.children, "Keskeneräinen");

    // Summary preview is rendered
    const previewDiv = element.props.children[1];
    assert.equal(previewDiv.props.children, "Nordic Pixel Oy · Helsinki");
  });

  it("renders custom status badge when provided", () => {
    const customBadge = React.createElement("span", { className: "custom-pill" }, "15.0 op");
    const element = CollapsiblePlanSection({
      id: "test-section-3",
      title: "3. Harjoittelun ehdot",
      statusBadge: customBadge,
      isCollapsed: false,
      onToggle: () => {},
      children: null,
    });

    const headerLeft = element.props.children[0].props.children[0];
    const renderedBadge = headerLeft.props.children[0].props.children[1];
    assert.equal(renderedBadge.props.className, "custom-pill");
    assert.equal(renderedBadge.props.children, "15.0 op");
  });

  it("supports keyboard Enter and Space toggle when collapsed", () => {
    let toggledCount = 0;
    const element = CollapsiblePlanSection({
      id: "test-section-keyboard",
      title: "Test Keyboard",
      isCollapsed: true,
      onToggle: () => {
        toggledCount++;
      },
      children: null,
    });

    let prevented = false;
    element.props.onKeyDown({
      key: "Enter",
      preventDefault: () => {
        prevented = true;
      },
    });
    assert.equal(toggledCount, 1);
    assert.equal(prevented, true);

    prevented = false;
    element.props.onKeyDown({
      key: " ",
      preventDefault: () => {
        prevented = true;
      },
    });
    assert.equal(toggledCount, 2);
    assert.equal(prevented, true);
  });

  it("applies card class when variant is explicitly set to card", () => {
    const expandedCard = CollapsiblePlanSection({
      id: "card-expanded",
      title: "Card Test",
      variant: "card",
      isCollapsed: false,
      onToggle: () => {},
      children: null,
    });
    assert.ok(expandedCard.props.className.includes("card"));

    const collapsedCard = CollapsiblePlanSection({
      id: "card-collapsed",
      title: "Card Test",
      variant: "card",
      isCollapsed: true,
      onToggle: () => {},
      children: null,
    });
    assert.ok(collapsedCard.props.className.includes("card"));
  });
});
