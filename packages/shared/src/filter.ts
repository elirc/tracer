import { z } from "zod";

// Filters as DATA, not code (S10). A saved view is a serialized predicate tree, so it can be stored,
// analyzed (which fields need indexes), and compiled to two targets: a pure client evaluator (for
// instant, offline filtering over the local store) and a server SQL/Prisma where-clause. The FIELD
// set is a closed enum — that's the security boundary: user input never becomes a raw column name.

export const FilterFieldSchema = z.enum(["stateType", "priority", "assigneeId"]);
export type FilterField = z.infer<typeof FilterFieldSchema>;

export const FilterOpSchema = z.enum(["eq", "neq", "in"]);
export type FilterOp = z.infer<typeof FilterOpSchema>;

export interface Condition {
  kind: "condition";
  field: FilterField;
  op: FilterOp;
  value: string | string[];
}
export interface Group {
  kind: "group";
  combinator: "and" | "or";
  children: FilterNode[];
}
export type FilterNode = Condition | Group;

const ConditionSchema: z.ZodType<Condition> = z.object({
  kind: z.literal("condition"),
  field: FilterFieldSchema,
  op: FilterOpSchema,
  value: z.union([z.string(), z.array(z.string())]),
});
export const FilterNodeSchema: z.ZodType<FilterNode> = z.lazy(() =>
  z.union([
    ConditionSchema,
    z.object({
      kind: z.literal("group"),
      combinator: z.enum(["and", "or"]),
      children: z.array(FilterNodeSchema),
    }),
  ]),
);

/** What a filter runs against on the client (a subset of the issue). */
export interface FilterableIssue {
  stateType: string;
  priority: string;
  assigneeId: string | null;
}

function fieldValue(issue: FilterableIssue, field: FilterField): string | null {
  if (field === "stateType") return issue.stateType;
  if (field === "priority") return issue.priority;
  return issue.assigneeId;
}

/** The pure client evaluator — runs a filter over a local issue with zero server round-trip. */
export function evaluate(node: FilterNode, issue: FilterableIssue): boolean {
  if (node.kind === "group") {
    const results = node.children.map((c) => evaluate(c, issue));
    return node.combinator === "and" ? results.every(Boolean) : results.some(Boolean);
  }
  const actual = fieldValue(issue, node.field);
  const values = Array.isArray(node.value) ? node.value : [node.value];
  switch (node.op) {
    case "eq":
      return actual === node.value;
    case "neq":
      return actual !== node.value;
    case "in":
      return actual !== null && values.includes(actual);
  }
}
