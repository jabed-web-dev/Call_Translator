const folderInput = document.querySelector("#folderInput");
const filesInput = document.querySelector("#filesInput");
const folderStatus = document.querySelector("#folderStatus");
const audioList = document.querySelector("#audioList");
const messages = document.querySelector("#messages");
const welcome = document.querySelector("#welcome");
const settingsPanel = document.querySelector("#settingsPanel");
const speakerSelect = document.querySelector("#speakerSelect");

let selectedFiles = [];

const audioExtensions = /\.(mp3|m4a|wav|ogg|webm|mp4|mpeg|mpga|flac)$/i;
const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

document.querySelector("#settingsToggle").addEventListener("click", () => {
  settingsPanel.classList.toggle("hidden");
});
document.querySelector("#chooseButton").addEventListener("click", () => filesInput.click());
document.querySelector("#chooseFirst").addEventListener("click", () => filesInput.click());

folderInput.addEventListener("change", () => setFiles([...folderInput.files], true));
filesInput.addEventListener("change", () => setFiles([...filesInput.files], false));

function setFiles(files, fromFolder) {
  selectedFiles = files.filter(file => file.type.startsWith("audio/") || audioExtensions.test(file.name));
  selectedFiles.sort((a, b) => (a.webkitRelativePath || a.name).localeCompare(b.webkitRelativePath || b.name));
  audioList.replaceChildren();
  if (!selectedFiles.length) {
    folderStatus.textContent = "No supported audio files found. Try selecting audio files directly.";
    return;
  }
  const folderName = fromFolder ? (selectedFiles[0].webkitRelativePath || "").split("/")[0] : "Selected audio files";
  folderStatus.textContent = `${folderName || "Audio folder"} · ${selectedFiles.length} audio file(s) selected.`;
  welcome.classList.add("hidden");

  selectedFiles.forEach((file, index) => {
    const item = document.createElement("div");
    item.className = "audio-item";
    const symbol = document.createElement("div");
    symbol.className = "audio-symbol";
    symbol.textContent = "🎵";
    const meta = document.createElement("div");
    meta.className = "audio-meta";
    const name = document.createElement("div");
    name.className = "audio-name";
    name.textContent = file.webkitRelativePath || file.name;
    const size = document.createElement("div");
    size.className = "audio-size";
    size.textContent = formatBytes(file.size);
    meta.append(name, size);
    const button = document.createElement("button");
    button.className = "translate-button";
    button.textContent = "Translate";
    button.addEventListener("click", () => translateFile(file, button));
    item.append(symbol, meta, button);
    audioList.append(item);
  });
  settingsPanel.classList.add("hidden");
}

async function translateFile(file, button) {
  const speaker = speakerSelect.value;
  button.disabled = true;
  button.textContent = "Working…";
  const loading = document.createElement("div");
  loading.className = "loading-card";
  loading.innerHTML = '<span class="spinner"></span><span>Transcribing and translating audio…</span>';
  messages.prepend(loading);
  try {
    const body = new FormData();
    body.append("audio", file, file.name);
    const response = await fetch("/api/translate-audio", { method: "POST", body });
    const result = await response.json();
    loading.remove();
    if (!response.ok) throw new Error(result.error || "Translation failed.");
    renderMessage(result, speaker);
  } catch (error) {
    loading.remove();
    const errorCard = document.createElement("div");
    errorCard.className = "error-card";
    errorCard.textContent = error instanceof Error ? error.message : "Something went wrong.";
    messages.prepend(errorCard);
  } finally {
    button.disabled = false;
    button.textContent = "Translate";
  }
}

function addSection(parent, label, text, extraClass = "") {
  if (!text) return;
  const title = document.createElement("div");
  title.className = "section-label";
  title.textContent = label;
  const content = document.createElement("div");
  content.className = `transcript ${extraClass}`.trim();
  content.textContent = text;
  parent.append(title, content);
}

function renderMessage(result, speaker) {
  welcome.classList.add("hidden");
  const row = document.createElement("article");
  row.className = `message-row ${speaker}`;
  const speakerName = document.createElement("div");
  speakerName.className = "speaker-name";
  speakerName.textContent = speaker === "customer" ? "Customer" : "Me";
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const fileTitle = document.createElement("div");
  fileTitle.className = "file-title";
  fileTitle.textContent = `🎧 ${result.fileName}`;
  bubble.append(fileTitle);

  addSection(bubble, "Original speech", result.originalText, result.detectedLanguage === "Arabic" ? "arabic" : "");
  if (result.arabicText && result.arabicText !== result.originalText) {
    addSection(bubble, "Arabic", result.arabicText, "arabic");
  }
  addSection(bubble, "English translation", result.englishTranslation);
  addSection(bubble, "বাংলা অনুবাদ", result.bengaliTranslation, "bengali");

  const note = document.createElement("div");
  note.className = "note";
  note.textContent = result.note || "Please check names, addresses, prices, and order details.";
  bubble.append(note);

  const time = document.createElement("div");
  time.className = "message-time";
  time.textContent = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit" }).format(new Date());
  bubble.append(time);
  row.append(speakerName, bubble);
  messages.prepend(row);
}


// Progressive Web App installation support. The browser controls whether install is available.
let deferredInstallPrompt = null;
const installButton = document.querySelector("#installButton");
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  installButton.classList.remove("hidden");
});
installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) {
    alert("To install: open your browser menu and choose 'Add to Home screen' or 'Install app'.");
    return;
  }
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installButton.classList.add("hidden");
});
window.addEventListener("appinstalled", () => {
  installButton.classList.add("hidden");
});
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed:", error);
    });
  });
}
