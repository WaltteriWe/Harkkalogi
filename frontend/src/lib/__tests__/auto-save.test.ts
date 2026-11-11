import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatCurrentTime } from "../../hooks/useAutoSave";

describe("auto-save: formatCurrentTime", () => {
  it("formats time string matching HH:mm pattern", () => {
    const formatted = formatCurrentTime();
    assert.match(formatted, /^\d{2}:\d{2}$/);
  });
});
