import { useCallback, useEffect, useMemo, useState } from "react";

const storageKey = "swim-nfc-checkins";

const initialRoster = [
  { id: "s-001", name: "Ava Martinez" },
  { id: "s-002", name: "Liam Chen" },
  { id: "s-003", name: "Noah Johnson" },
  { id: "s-004", name: "Mia Patel" },
  { id: "s-005", name: "Sophia Brown" },
  { id: "s-006", name: "Ethan Park" },
  { id: "s-007", name: "Olivia Brooks" },
  { id: "s-008", name: "James Walker" },
  { id: "s-009", name: "Isabella Ruiz" },
  { id: "s-010", name: "Lucas Kim" },
  { id: "s-011", name: "Charlotte Hayes" },
  { id: "s-012", name: "Benjamin Reed" },
  { id: "s-013", name: "Amelia Clark" },
  { id: "s-014", name: "Henry Scott" },
  { id: "s-015", name: "Grace Evans" },
  { id: "s-016", name: "Daniel Rivera" },
  { id: "s-017", name: "Harper Collins" },
];

const nowString = () => new Date().toLocaleString();
const createSession = (labelOverride) => ({
  id: `session-${Date.now()}`,
  label: labelOverride || `Round ${nowString()}`,
  startedAt: nowString(),
});

export default function Home() {
  const [roster, setRoster] = useState(initialRoster);
  const [tagMap, setTagMap] = useState({});
  const [logs, setLogs] = useState([]);
  const [status, setStatus] = useState("");
  const [scanMode, setScanMode] = useState("checkin");
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [nfcAvailable, setNfcAvailable] = useState(false);
  const [sessions, setSessions] = useState([createSession()]);
  const [activeSessionId, setActiveSessionId] = useState("");
  const [newSessionLabel, setNewSessionLabel] = useState("");

  useEffect(() => {
    setNfcAvailable(typeof window !== "undefined" && "NDEFReader" in window);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(storageKey);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.roster) setRoster(parsed.roster);
      if (parsed?.tagMap) setTagMap(parsed.tagMap);
      if (parsed?.logs) setLogs(parsed.logs);
      if (parsed?.sessions?.length) setSessions(parsed.sessions);
      if (parsed?.activeSessionId) setActiveSessionId(parsed.activeSessionId);
    } catch (error) {
      setStatus("Saved data was corrupted and was reset.");
    }
  }, []);

  useEffect(() => {
    if (!activeSessionId && sessions.length) {
      setActiveSessionId(sessions[0].id);
    }
  }, [activeSessionId, sessions]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      storageKey,
      JSON.stringify({ roster, tagMap, logs, sessions, activeSessionId })
    );
  }, [roster, tagMap, logs, sessions, activeSessionId]);

  const sessionById = useMemo(
    () => Object.fromEntries(sessions.map((session) => [session.id, session])),
    [sessions]
  );

  const activeSession = activeSessionId ? sessionById[activeSessionId] : sessions[0];

  const checkedInIds = useMemo(() => {
    if (!activeSessionId) return new Set();
    return new Set(
      logs
        .filter((log) => log.type === "check-in" && log.sessionId === activeSessionId)
        .map((log) => log.athleteId)
    );
  }, [activeSessionId, logs]);

  const remainingAthletes = useMemo(
    () => roster.filter((athlete) => !checkedInIds.has(athlete.id)),
    [checkedInIds, roster]
  );

  const handleLog = useCallback((entry) => {
    setLogs((prev) => [entry, ...prev]);
  }, []);

  const handleCheckIn = useCallback(
    (athlete, source) => {
      if (activeSessionId && checkedInIds.has(athlete.id)) {
        setStatus(`${athlete.name} is already checked in for this round.`);
        return;
      }
      handleLog({
        id: `${athlete.id}-${Date.now()}`,
        athleteId: athlete.id,
        name: athlete.name,
        time: nowString(),
        type: "check-in",
        source,
        sessionId: activeSessionId,
      });
      setStatus(`${athlete.name} checked in via ${source}.`);
    },
    [activeSessionId, checkedInIds, handleLog]
  );

  const handleNfcScan = useCallback(async () => {
    if (!nfcAvailable) {
      setStatus("NFC is not available on this device/browser.");
      return;
    }

    try {
      setIsScanning(true);
      setStatus("Hold the NFC tag near the phone to scan.");
      const reader = new window.NDEFReader();
      await reader.scan();
      reader.onreading = (event) => {
        const tagId = event.serialNumber || "unknown-tag";
        if (scanMode === "register") {
          if (!selectedAthlete) {
            setStatus("Select an athlete before registering a tag.");
            return;
          }
          setTagMap((prev) => ({ ...prev, [tagId]: selectedAthlete }));
          const athlete = roster.find((entry) => entry.id === selectedAthlete);
          if (athlete) {
            handleLog({
              id: `tag-${tagId}-${Date.now()}`,
              athleteId: athlete.id,
              name: athlete.name,
              time: nowString(),
              type: "tag-registered",
              source: "NFC",
              sessionId: activeSessionId,
            });
            setStatus(`Registered tag for ${athlete.name}.`);
          }
        } else {
          const athleteId = tagMap[tagId];
          const athlete = roster.find((entry) => entry.id === athleteId);
          if (!athlete) {
            setStatus("Tag not recognized. Switch to register mode to link it.");
            handleLog({
              id: `unknown-${tagId}-${Date.now()}`,
              athleteId: "unknown",
              name: "Unknown tag",
              time: nowString(),
              type: "unknown-tag",
              source: "NFC",
              sessionId: activeSessionId,
            });
            return;
          }
          handleCheckIn(athlete, "NFC");
        }
      };
      reader.onerror = () => {
        setStatus("NFC scan failed. Try again.");
      };
    } catch (error) {
      setStatus("NFC scan permission denied or unavailable.");
    } finally {
      setIsScanning(false);
    }
  }, [activeSessionId, handleCheckIn, handleLog, nfcAvailable, roster, scanMode, selectedAthlete, tagMap]);

  const handleManualCheckIn = (athlete) => {
    handleCheckIn(athlete, "manual");
  };

  const handleAddAthlete = (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const name = formData.get("name");
    if (!name) return;
    setRoster((prev) => [
      ...prev,
      { id: `s-${Date.now()}`, name: name.toString() },
    ]);
    event.target.reset();
  };

  const handleStartNewSession = () => {
    const newSession = createSession(newSessionLabel.trim() || undefined);
    setSessions((prev) => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setNewSessionLabel("");
    setStatus(`New check-in round started: ${newSession.label}`);
  };

  const checkedInCount = checkedInIds.size;
  const remainingCount = roster.length - checkedInCount;
  const progressPercent = roster.length
    ? Math.round((checkedInCount / roster.length) * 100)
    : 0;

  return (
    <div className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">Swim Team Travel</p>
          <h1>NFC Trip Check-In Hub</h1>
          <p className="subtitle">
            Fast tap check-ins for travel days. Start a new round before leaving any
            location, then let all 17 athletes tap once as a group.
          </p>
          <div className="progress">
            <div className="progress-header">
              <span>Round progress</span>
              <strong>{progressPercent}%</strong>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${progressPercent}%` }} />
            </div>
            <p className="progress-meta">
              {checkedInCount} checked in · {remainingCount} remaining
            </p>
          </div>
          <div className="hero-actions">
            <button className="primary" onClick={handleNfcScan} disabled={isScanning}>
              {isScanning ? "Scanning…" : "Start NFC Scan"}
            </button>
            <div className="toggle-group">
              <button
                className={scanMode === "checkin" ? "active" : ""}
                onClick={() => setScanMode("checkin")}
              >
                Check-in Mode
              </button>
              <button
                className={scanMode === "register" ? "active" : ""}
                onClick={() => setScanMode("register")}
              >
                Register Tag Mode
              </button>
            </div>
          </div>
          <p className="status">{status || "Ready for the next tap."}</p>
        </div>
        <div className="summary-card">
          <h2>Trip Status</h2>
          <div className="summary-grid">
            <div>
              <span className="summary-label">Checked in</span>
              <span className="summary-value">{checkedInCount}</span>
            </div>
            <div>
              <span className="summary-label">Remaining</span>
              <span className="summary-value">{remainingCount}</span>
            </div>
            <div>
              <span className="summary-label">Total athletes</span>
              <span className="summary-value">{roster.length}</span>
            </div>
            <div>
              <span className="summary-label">NFC support</span>
              <span className={`summary-pill ${nfcAvailable ? "ok" : "warn"}`}>
                {nfcAvailable ? "Available" : "Not available"}
              </span>
            </div>
            <div>
              <span className="summary-label">Active round</span>
              <span className="summary-pill">{activeSession?.label || ""}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="content">
        <section className="panel panel-highlight">
          <h2>Check-In Rounds</h2>
          <p className="hint">
            Start a new round before leaving any location (airport, bus, hotel). Each
            athlete taps once per round for a single, fast event.
          </p>
          <div className="session-bar">
            <div className="session-actions">
              <input
                value={newSessionLabel}
                onChange={(event) => setNewSessionLabel(event.target.value)}
                placeholder="Label this round (optional)"
              />
              <button type="button" onClick={handleStartNewSession}>
                Start new round
              </button>
            </div>
            <div className="session-list">
              {sessions.map((session) => (
                <button
                  key={session.id}
                  className={`session-chip ${
                    activeSessionId === session.id ? "active" : ""
                  }`}
                  onClick={() => setActiveSessionId(session.id)}
                >
                  <span>{session.label}</span>
                  <small>{session.startedAt}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="panel-grid">
          <div className="panel">
            <h2>Roster</h2>
            <p className="hint">Tap a name to manually check in when NFC isn’t handy.</p>
            <div className="roster-list">
              {roster.map((athlete) => (
                <button
                  key={athlete.id}
                  className={`roster-card ${checkedInIds.has(athlete.id) ? "checked" : ""}`}
                  onClick={() => handleManualCheckIn(athlete)}
                >
                  <div>
                    <span className="name">{athlete.name}</span>
                    <span className="lane">Team traveler</span>
                  </div>
                  <span className="badge">
                    {checkedInIds.has(athlete.id) ? "Checked in this round" : "Ready"}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="panel">
            <h2>Still Missing This Round</h2>
            <p className="hint">
              Quick view of athletes who have not tapped yet. Great for doing a fast roll
              call before departure.
            </p>
            {remainingAthletes.length === 0 ? (
              <p className="status">Everyone is checked in for this round.</p>
            ) : (
              <div className="chip-grid">
                {remainingAthletes.map((athlete) => (
                  <span key={athlete.id} className="chip">
                    {athlete.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="panel">
          <h2>Register NFC Tags</h2>
          <p className="hint">Assign a tag to an athlete before using check-in mode.</p>
          <label htmlFor="athlete-select">Select athlete</label>
          <select
            id="athlete-select"
            value={selectedAthlete}
            onChange={(event) => setSelectedAthlete(event.target.value)}
          >
            <option value="">Select from roster</option>
            {roster.map((athlete) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.name}
              </option>
            ))}
          </select>
          <div className="tag-table">
            {Object.entries(tagMap).length === 0 ? (
              <p className="hint">No tags linked yet.</p>
            ) : (
              Object.entries(tagMap).map(([tagId, athleteId]) => {
                const athlete = roster.find((entry) => entry.id === athleteId);
                return (
                  <div className="tag-row" key={tagId}>
                    <span className="tag-id">{tagId}</span>
                    <span>{athlete ? athlete.name : "Unknown athlete"}</span>
                  </div>
                );
              })
            )}
          </div>
          <form className="add-form" onSubmit={handleAddAthlete}>
            <h3>Add athlete</h3>
            <div className="form-grid">
              <input name="name" placeholder="Athlete name" required />
              <button type="submit">Add to roster</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <h2>Live Check-In Log</h2>
          <p className="hint">Share this list with chaperones or copy for reports.</p>
          <div className="log-list">
            {logs.length === 0 ? (
              <p className="hint">No activity yet.</p>
            ) : (
              logs.map((log) => (
                <div className="log-row" key={log.id}>
                  <div>
                    <span className="log-name">{log.name}</span>
                    <span className="log-meta">
                      {(sessionById[log.sessionId]?.label || "Round")}
                      {" · "}
                      {log.type.replace("-", " ")} · {log.source}
                    </span>
                  </div>
                  <span className="log-time">{log.time}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      <footer className="footer">
        <p>
          Tip: NFC check-in works on Chrome for Android. For iOS, use manual
          check-in or a dedicated NFC reader.
        </p>
      </footer>
    </div>
  );
}
