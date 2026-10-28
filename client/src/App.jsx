import { useEffect, useState } from "react";

const TONES = ["Polite", "Formal", "Friendly", "Apologetic", "Assertive"];
const LENGTHS = ["Short", "Medium", "Detailed"];
const LANGUAGES = ["English", "Telugu", "Hindi", "Tamil", "Spanish", "French"];

async function api(path, options) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...options });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

export default function App() {
  const [mode, setMode] = useState("write"); // "write" | "reply"
  const [instruction, setInstruction] = useState("");
  const [incoming, setIncoming] = useState("");
  const [tone, setTone] = useState("Polite");
  const [length, setLength] = useState("Medium");
  const [language, setLanguage] = useState("English");
  const [draft, setDraft] = useState(null); // {id, subject, body, source}
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState("");

  const loadHistory = () => api("/api/history").then(setHistory).catch((e) => setError(e.message));
  useEffect(() => { loadHistory(); }, []);

  const flash = (msg) => { setStatus(msg); setTimeout(() => setStatus(""), 2000); };

  async function generate(replaceId) {
    setError(""); setNotice("");
    if (mode === "write" && instruction.trim().length < 5) return setError("Write at least a few words about the email you need.");
    if (mode === "reply" && incoming.trim().length < 10) return setError("Paste the email you received first.");
    setLoading(true);
    try {
      const payload = { mode, instruction, incoming, tone, length, language, replaceId };
      const { draft: d, notice: n } = await api("/api/draft", { method: "POST", body: JSON.stringify(payload) });
      setDraft(d); setNotice(n || ""); loadHistory();
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`Subject: ${draft.subject}\n\n${draft.body}`);
      flash("Copied");
    } catch { flash("Copy failed. Select the text and copy it manually."); }
  }

  function openGmail() {
    const url = `https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}`;
    window.open(url, "_blank", "noopener");
  }

  async function saveEdits() {
    try {
      const row = await api(`/api/history/${draft.id}`, { method: "PUT", body: JSON.stringify({ subject: draft.subject, body: draft.body }) });
      setDraft(row); loadHistory(); flash("Changes saved");
    } catch (e) { setError(e.message); }
  }

  async function remove(id) {
    try {
      await api(`/api/history/${id}`, { method: "DELETE" });
      if (draft?.id === id) setDraft(null);
      loadHistory();
    } catch (e) { setError(e.message); }
  }

  return (
    <div className="page">
      <header>
        <h1>Email Draft Helper</h1>
        <p>Write a new email or reply to one you received. Pick a tone, length and language, then edit and send it yourself.</p>
      </header>

      <main>
        <section className="panel compose">
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={mode === "write"} className={mode === "write" ? "tab on" : "tab"} onClick={() => setMode("write")}>Write new email</button>
            <button role="tab" aria-selected={mode === "reply"} className={mode === "reply" ? "tab on" : "tab"} onClick={() => setMode("reply")}>Reply to an email</button>
          </div>

          {mode === "reply" && (
            <>
              <label htmlFor="incoming">Email you received</label>
              <textarea id="incoming" rows={6} maxLength={4000} value={incoming} onChange={(e) => setIncoming(e.target.value)}
                placeholder="Paste the email you want to reply to." />
            </>
          )}

          <label htmlFor="instruction">{mode === "reply" ? "What should your reply say? (optional)" : "What should the email say?"}</label>
          <textarea
            id="instruction" rows={mode === "reply" ? 3 : 4} maxLength={1000} value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder={mode === "reply" ? "Say yes, but ask if we can meet on Monday instead." : "Ask my professor for a one-week extension on the lab report because I was ill."}
          />

          <div className="selects">
            <div>
              <label htmlFor="tone">Tone</label>
              <select id="tone" value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label htmlFor="length">Length</label>
              <select id="length" value={length} onChange={(e) => setLength(e.target.value)}>{LENGTHS.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
            <div>
              <label htmlFor="language">Language</label>
              <select id="language" value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGES.map((t) => <option key={t}>{t}</option>)}</select>
            </div>
          </div>

          <div className="row end">
            <button className="primary" onClick={() => generate()} disabled={loading}>
              {loading ? "Writing draft..." : mode === "reply" ? "Generate reply" : "Generate draft"}
            </button>
          </div>
          {error && <p className="msg error" role="alert">{error}</p>}
        </section>

        <section className="panel sheet" aria-live="polite">
          {!draft ? (
            <p className="empty">Your draft will appear here. Fill in the form on the left and select Generate.</p>
          ) : (
            <>
              {notice && <p className="msg note">{notice}</p>}
              <label htmlFor="subject">Subject</label>
              <input id="subject" value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value })} />
              <label htmlFor="body">Message</label>
              <textarea id="body" className="letter" rows={12} value={draft.body} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              <div className="row end wrap">
                <span className="status">{status}</span>
                <button onClick={() => generate(draft.id)} disabled={loading}>Regenerate</button>
                <button onClick={saveEdits}>Save changes</button>
                <button onClick={openGmail}>Open in Gmail</button>
                <button className="primary" onClick={copy}>Copy email</button>
              </div>
            </>
          )}
        </section>

        <aside className="panel history">
          <h2>History</h2>
          {history.length === 0 ? (
            <p className="empty">No drafts yet.</p>
          ) : (
            <ul>
              {history.map((h) => (
                <li key={h.id} className={draft?.id === h.id ? "active" : ""}>
                  <button className="item" onClick={() => { setDraft(h); setNotice(""); }}>
                    <strong>{h.subject}</strong>
                    <span>{h.tone} - {new Date(h.created_at).toLocaleString()}</span>
                  </button>
                  <button className="del" aria-label={`Delete draft: ${h.subject}`} onClick={() => remove(h.id)}>Delete</button>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </main>
    </div>
  );
}
