(() => {
  const SESSION_KEY = "ravin_core_session";
  const MODE_KEY = "ravin_core_mode";
  const SPEAK_KEY = "ravin_core_speak";

  const conversation = document.querySelector("#conversation");
  const composer = document.querySelector("#composer");
  const input = document.querySelector("#messageInput");
  const sendButton = document.querySelector("#sendButton");
  const coreButton = document.querySelector("#coreButton");
  const stateLabel = document.querySelector("#stateLabel");
  const statusText = document.querySelector("#statusText");
  const modeButton = document.querySelector("#modeButton");
  const speakToggle = document.querySelector("#speakToggle");
  const resetButton = document.querySelector("#resetButton");

  let sessionId = localStorage.getItem(SESSION_KEY) || null;
  let mode = localStorage.getItem(MODE_KEY) === "work" ? "work" : "conversation";
  let speakEnabled = localStorage.getItem(SPEAK_KEY) !== "false";
  let busy = false;

  function setState(state, detail = "") {
    coreButton.className = "core " + state.toLowerCase();
    stateLabel.textContent = state.toUpperCase();
    if (detail) statusText.textContent = detail;
  }

  function setMode(nextMode) {
    mode = nextMode === "work" ? "work" : "conversation";
    localStorage.setItem(MODE_KEY, mode);
    modeButton.textContent = mode === "work" ? "WORK" : "CONVERSATION";
  }

  function updateSpeakButton() {
    speakToggle.textContent = speakEnabled ? "VOICE ON" : "VOICE OFF";
  }

  function addMessage(role, text) {
    const wrapper = document.createElement("div");
    wrapper.className = "message " + role;

    const label = document.createElement("div");
    label.className = "message-label";
    label.textContent = role === "user" ? "YOU" : "RAVIN";

    const body = document.createElement("div");
    body.className = "message-body";
    body.textContent = text;

    wrapper.append(label, body);
    conversation.appendChild(wrapper);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function speak(text) {
    if (!speakEnabled || !("speechSynthesis" in window)) return;

    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 0.95;
    utterance.volume = 1;

    utterance.onstart = () => setState("speaking", "RAVIN is speaking");
    utterance.onend = () => setState("ready", "Core link online");
    utterance.onerror = () => setState("ready", "Core link online");

    speechSynthesis.speak(utterance);
  }

  async function sendMessage(text) {
    if (busy || !text.trim()) return;

    busy = true;
    sendButton.disabled = true;
    input.disabled = true;
    addMessage("user", text.trim());
    setState("thinking", "RAVIN is thinking");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          mode,
          session_id: sessionId,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (data.session_id) {
        sessionId = data.session_id;
        localStorage.setItem(SESSION_KEY, sessionId);
      }

      if (!response.ok) {
        throw new Error(data.error || "RAVIN request failed.");
      }

      addMessage("assistant", data.reply);
      statusText.textContent =
        (data.model ? data.model.split("/").pop() : "RAVIN") +
        " · " +
        (data.latency_ms || 0) +
        " ms";

      speak(data.reply);
      if (!speakEnabled) setState("ready", statusText.textContent);
    } catch (error) {
      addMessage("assistant", "Core error: " + (error?.message || String(error)));
      setState("error", "Check server configuration");
    } finally {
      busy = false;
      sendButton.disabled = false;
      input.disabled = false;
      input.focus();
    }
  }

  composer.addEventListener("submit", (event) => {
    event.preventDefault();
    const text = input.value;
    input.value = "";
    input.style.height = "auto";
    sendMessage(text);
  });

  input.addEventListener("input", () => {
    input.style.height = "auto";
    input.style.height = Math.min(input.scrollHeight, 160) + "px";
  });

  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      composer.requestSubmit();
    }
  });

  coreButton.addEventListener("click", () => {
    input.focus();
  });

  modeButton.addEventListener("click", () => {
    setMode(mode === "conversation" ? "work" : "conversation");
    statusText.textContent =
      mode === "work"
        ? "Work mode selected"
        : "Conversation mode selected";
  });

  speakToggle.addEventListener("click", () => {
    speakEnabled = !speakEnabled;
    localStorage.setItem(SPEAK_KEY, String(speakEnabled));
    if (!speakEnabled && "speechSynthesis" in window) speechSynthesis.cancel();
    updateSpeakButton();
  });

  resetButton.addEventListener("click", async () => {
    const oldSession = sessionId;
    sessionId = null;
    localStorage.removeItem(SESSION_KEY);
    conversation.innerHTML = "";
    setState("ready", "New session");

    if (oldSession) {
      fetch("/api/session/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: oldSession }),
      }).catch(() => {});
    }
  });

  async function checkHealth() {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();

      if (!data.aiConfigured) {
        setState("ready", "Add Cloudflare secrets to activate RAVIN");
      } else {
        setState("ready", "Core link online");
      }
    } catch {
      setState("error", "Server unavailable");
    }
  }

  setMode(mode);
  updateSpeakButton();
  checkHealth();
})();
