import type { FilterNode } from "@tracer/shared";
import { Prisma } from "@tracer/db";

/**
 * Compile a filter AST to a Prisma where-clause — the SERVER evaluation target (the client evaluator
 * lives in @tracer/shared). Because the field set is a closed enum (validated by zod before we get
 * here), this can never turn user input into a raw column name: the schema is the injection boundary.
 * An equivalence test pins client eval ≡ server eval so the two implementations can't drift.
 */
export function compileFilter(node: FilterNode): Prisma.IssueWhereInput {
  if (node.kind === "group") {
    const children = node.children.map(compileFilter);
    return (node.combinator === "and" ? { AND: children } : { OR: children }) as Prisma.IssueWhereInput;
  }
  const values = Array.isArray(node.value) ? node.value : [node.value];
  const clause = (): unknown => {
    switch (node.field) {
      case "stateType":
        if (node.op === "in") return { state: { type: { in: values } } };
        if (node.op === "neq") return { state: { type: { not: node.value } } };
        return { state: { type: node.value } };
      case "priority":
        if (node.op === "in") return { priority: { in: values } };
        if (node.op === "neq") return { priority: { not: node.value } };
        return { priority: node.value };
      case "assigneeId":
        if (node.op === "in") return { assigneeId: { in: values } };
        if (node.op === "neq") return { assigneeId: { not: node.value } };
        return { assigneeId: node.value };
    }
  };
  return clause() as Prisma.IssueWhereInput;
}
