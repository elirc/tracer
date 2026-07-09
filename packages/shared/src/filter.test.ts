import { describe, it, expect } from "vitest";
import { evaluate, type FilterNode, type FilterableIssue } from "./filter";

const issue = (over: Partial<FilterableIssue> = {}): FilterableIssue => ({
  stateType: "STARTED",
  priority: "HIGH",
  assigneeId: "u1",
  ...over,
});

describe("filter evaluator", () => {
  it("eq / neq / in", () => {
    const started: FilterNode = { kind: "condition", field: "stateType", op: "eq", value: "STARTED" };
    expect(evaluate(started, issue())).toBe(true);
    expect(evaluate(started, issue({ stateType: "DONE" }))).toBe(false);

    const notDone: FilterNode = { kind: "condition", field: "stateType", op: "neq", value: "DONE" };
    expect(evaluate(notDone, issue())).toBe(true);

    const hiOrUrgent: FilterNode = {
      kind: "condition",
      field: "priority",
      op: "in",
      value: ["HIGH", "URGENT"],
    };
    expect(evaluate(hiOrUrgent, issue())).toBe(true);
    expect(evaluate(hiOrUrgent, issue({ priority: "LOW" }))).toBe(false);
  });

  it("and / or groups compose", () => {
    const filter: FilterNode = {
      kind: "group",
      combinator: "and",
      children: [
        { kind: "condition", field: "stateType", op: "eq", value: "STARTED" },
        { kind: "condition", field: "assigneeId", op: "eq", value: "u1" },
      ],
    };
    expect(evaluate(filter, issue())).toBe(true);
    expect(evaluate(filter, issue({ assigneeId: "u2" }))).toBe(false);

    const orFilter: FilterNode = { ...filter, combinator: "or" };
    expect(evaluate(orFilter, issue({ assigneeId: "u2" }))).toBe(true);
  });
});
