import { useState, type CSSProperties } from "react";
import { useIssueComments } from "./lib/useIssueComments";

export function Comments({ issueId }: { issueId: string }) {
  const { comments, addComment } = useIssueComments(issueId);
  const [body, setBody] = useState("");

  const submit = async () => {
    if (!body.trim()) return;
    await addComment(body.trim());
    setBody("");
  };

  return (
    <div style={wrap}>
      {comments.length === 0 && (
        <p style={{ color: "var(--muted)", margin: "4px 0" }}>No comments yet.</p>
      )}
      {comments.map((c) => (
        <div key={c.id} style={{ padding: "4px 0" }}>
          <strong style={{ color: "var(--accent)" }}>{c.author.name ?? c.author.email}</strong>{" "}
          <span>{c.body}</span>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <input
          style={input}
          placeholder="Add a comment…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void submit();
          }}
        />
        <button style={button} onClick={() => void submit()}>
          Send
        </button>
      </div>
    </div>
  );
}

const wrap: CSSProperties = {
  marginLeft: 82,
  padding: "8px 12px",
  borderLeft: "2px solid var(--border)",
  fontSize: 13,
};
const input: CSSProperties = {
  flex: 1,
  background: "var(--bg)",
  color: "var(--text)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  padding: "6px 8px",
};
const button: CSSProperties = {
  background: "var(--accent)",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "6px 12px",
  cursor: "pointer",
};
