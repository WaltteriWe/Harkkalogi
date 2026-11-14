import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import SubmissionChecklist, {
  ChecklistIcon,
  type SubmissionChecklistItem,
} from "../../components/submissionChecklist";

describe("SubmissionChecklist component structure and props", () => {
  it("renders a ChecklistIcon for completed state with step-icon-done", () => {
    const iconElement = ChecklistIcon({ done: true });
    assert.ok(React.isValidElement<any>(iconElement));
    assert.equal(iconElement.props["aria-label"], "Completed");
    assert.ok(iconElement.props.className.includes("step-icon-done"));
  });

  it("renders a ChecklistIcon for todo state with step-icon-todo", () => {
    const iconElement = ChecklistIcon({ done: false });
    assert.ok(React.isValidElement<any>(iconElement));
    assert.equal(iconElement.props["aria-label"], "To do");
    assert.ok(iconElement.props.className.includes("step-icon-todo"));
  });

  it("creates a valid SubmissionChecklist element with static items", () => {
    const items: SubmissionChecklistItem[] = [
      { id: "item-1", label: "Workplace filled", done: true },
      { id: "item-2", label: "Hours logged", done: false },
    ];

    const element = SubmissionChecklist({
      title: "Before you submit",
      items,
      note: "Your plan must be approved first.",
    });

    assert.ok(React.isValidElement<any>(element));
    assert.equal(element.type, "aside");
    assert.ok(element.props.className.includes("card"));
    assert.ok(!element.props.className.includes("sticky"));
  });

  it("applies sticky top-6 class when sticky prop is true", () => {
    const items: SubmissionChecklistItem[] = [
      { id: "topic-1", label: "Topics evaluated", done: true },
    ];

    const element = SubmissionChecklist({
      title: "Arvioinnin tila",
      items,
      sticky: true,
    });

    assert.ok(React.isValidElement<any>(element));
    assert.ok(element.props.className.includes("sticky top-6"));
  });

  it("renders pure static checklist items with icons and labels", () => {
    const items: SubmissionChecklistItem[] = [
      {
        id: "supervisor-feedback",
        label: "Supervisor feedback requested",
        done: true,
      },
      {
        id: "work-cert",
        label: "Work certificate attached",
        done: false,
      },
    ];

    const element = SubmissionChecklist({
      title: "Report status",
      items,
    });

    assert.ok(React.isValidElement<any>(element));
    const children = React.Children.toArray(element.props.children);
    const ul = children.find(
      (child): child is React.ReactElement<any> =>
        React.isValidElement<any>(child) && child.type === "ul"
    );
    assert.ok(ul, "Checklist should contain an unordered list <ul>");

    const listItems = React.Children.toArray(ul.props.children);
    assert.equal(listItems.length, 2);

    const li1 = listItems[0] as React.ReactElement<any>;
    assert.equal(li1.type, "li");
    const li1Children = React.Children.toArray(li1.props.children);
    const icon1 = li1Children[0] as React.ReactElement<any>;
    assert.equal(icon1.props.done, true);

    const li2 = listItems[1] as React.ReactElement<any>;
    const li2Children = React.Children.toArray(li2.props.children);
    const icon2 = li2Children[0] as React.ReactElement<any>;
    assert.equal(icon2.props.done, false);
  });

  it("handles structured note object with title and text", () => {
    const items: SubmissionChecklistItem[] = [
      { id: "eval-1", label: "Guidance evaluated", done: true },
    ];

    const element = SubmissionChecklist({
      title: "Ennen lähetystä",
      items,
      note: {
        title: "Palaute kehittää ohjausta",
        text: "Vastauksesi auttavat kehittämään harjoittelupaikkoja.",
      },
    });

    assert.ok(React.isValidElement<any>(element));
    const children = React.Children.toArray(element.props.children);
    const noteDiv = children.find(
      (child): child is React.ReactElement<{ className?: string }> =>
        React.isValidElement<{ className?: string }>(child) &&
        Boolean(child.props.className?.includes("bg-brand-soft"))
    );
    assert.ok(noteDiv, "Note box should be rendered");
  });
});
