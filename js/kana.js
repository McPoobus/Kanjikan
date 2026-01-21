// js/kanji.js
// Loads deck from kanji.txt and runs the kanji trainer.
// Also renders the full deck at the bottom, grouped by section headers in kanji.txt.
//
// Deck supports lines like:
//   "日","nichi|jitsu|hi"
//   "山","yama"
// and (backward compatible):
//   kana: "日", romaji: "nichi|hi"
//
// Features:
// - Multiple answers via | (e.g., nichi|jitsu|hi)
// - Typing the kanji itself is accepted (e.g., 日)
// - IME-safe submit + input clearing
// - Renders tables into <div id="deckTables"></div>

let deck = [];

let currentIndex = 0;
let correct = 0;
let total = 0;

let isComposing = false;

function normalizeRomaji(s) {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Parse deck entries for quiz usage (ignores # comments)
 * Supports:
 *  - "あ","a"
 *  - kana: "あ", romaji: "a"
 */
function parseDeckText(text) {
  const lines = text.split(/\r?\n/);
  const out = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Preferred format: "kana","romaji"
    const simple = line.match(/^\s*"([^"]+)"\s*,\s*"([^"]+)"\s*$/);
    if (simple) {
      out.push({ kana: simple[1], romaji: simple[2] });
      continue;
    }

    // Backward-compatible format: kana: "え", romaji: "e"
    const kanaMatch = line.match(/kana\s*:\s*"([^"]+)"/);
    const romajiMatch = line.match(/romaji\s*:\s*"([^"]+)"/);
    if (kanaMatch && romajiMatch) {
      out.push({ kana: kanaMatch[1], romaji: romajiMatch[1] });
      continue;
    }

    console.warn("Skipping invalid deck line:", line);
  }

  return out;
}

/**
 * Parse the deck into labeled sections based on # comment headers.
 * Keeps entries under the most recent header.
 */
function parseDeckWithSections(rawText) {
  const lines = rawText.split(/\r?\n/);

  const sections = [];
  let current = { title: "Unlabeled", items: [] };

  function pushCurrentIfNotEmpty() {
    if (current.items.length > 0) sections.push(current);
  }

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    // Treat comment lines as potential section titles
    if (line.startsWith("#")) {
      const title = line.replace(/^#+\s*/, "").trim();

      // Ignore separator-only comment lines like "====="
      if (!title || /^=+$/.test(title)) continue;

      pushCurrentIfNotEmpty();
      current = { title, items: [] };
      continue;
    }

    // Entry format: "あ","a"
    const simple = line.match(/^\s*"([^"]+)"\s*,\s*"([^"]+)"\s*$/);
    if (simple) {
      current.items.push({ kana: simple[1], romaji: simple[2] });
      continue;
    }

    // Backward-compatible format: kana: "あ", romaji: "a"
    const kanaMatch = line.match(/kana\s*:\s*"([^"]+)"/);
    const romajiMatch = line.match(/romaji\s*:\s*"([^"]+)"/);
    if (kanaMatch && romajiMatch) {
      current.items.push({ kana: kanaMatch[1], romaji: romajiMatch[1] });
      continue;
    }

    console.warn("Skipping invalid section line:", line);
  }

  pushCurrentIfNotEmpty();
  return sections;
}

/**
 * Render sections into tables inside <div id="deckTables"></div>
 */
function renderDeckTablesFromSections(sections) {
  const host = document.getElementById("deckTables");
  if (!host) {
    console.warn('No element with id="deckTables" found in kana.html');
    return;
  }

  host.innerHTML = "";

  const cols = 12;

  for (const section of sections) {
    const h = document.createElement("h3");
    h.textContent = section.title;
    host.appendChild(h);

    const table = document.createElement("table");
    table.className = "kana-table";

    for (let i = 0; i < section.items.length; i += cols) {
      const tr = document.createElement("tr");

      for (let j = 0; j < cols; j++) {
        const td = document.createElement("td");
        const idx = i + j;

        if (idx < section.items.length) {
          const item = section.items[idx];
          td.innerHTML = `<span class="kana">${item.kana}</span><br><span class="romaji">${item.romaji}</span>`;
        } else {
          td.innerHTML = "&nbsp;";
        }

        tr.appendChild(td);
      }

      table.appendChild(tr);
    }

    host.appendChild(table);

    const hr = document.createElement("hr");
    hr.className = "dotted";
    host.appendChild(hr);
  }
}

function pickRandomNext() {
  if (deck.length <= 1) return 0;
  let next;
  do {
    next = Math.floor(Math.random() * deck.length);
  } while (next === currentIndex);
  return next;
}

function render() {
  if (deck.length === 0) return;
  document.getElementById("kana").textContent = deck[currentIndex].kana;
  document.getElementById("answer").innerHTML = "&nbsp;";
  document.getElementById("count").textContent = `Score: ${correct}/${total}`;
}

function showHint() {
  if (deck.length === 0) return;
  // Show raw romaji (may include o|wo)
  document.getElementById("answer").textContent = `Hint: ${deck[currentIndex].romaji}`;
}

function nextCard() {
  if (deck.length === 0) return;
  currentIndex = pickRandomNext();
  render();
  document.getElementById("input_box").focus();
}

function handleSubmit() {
  const input = document.getElementById("input_box");
  if (deck.length === 0) return;

  // If IME composition is active, Enter likely confirms composition
  if (isComposing) return;

  const typedRaw = input.value.trim();
  const typedRomaji = normalizeRomaji(typedRaw);

  const item = deck[currentIndex];
  const kana = item.kana;

  // Multiple romaji answers supported via |
  const acceptedRomaji = String(item.romaji)
    .split("|")
    .map(normalizeRomaji)
    .filter(Boolean);

  // Correct if user types kana exactly OR any accepted romaji
  const isCorrect = (typedRaw === kana) || acceptedRomaji.includes(typedRomaji);

  total++;

  if (isCorrect) {
    correct++;
    document.getElementById("answer").textContent = "Correct!";

    // IME-safe clear: clear now, then clear again next tick
    input.value = "";
    input.blur();
    input.focus();

    setTimeout(() => {
      input.value = "";
      input.setSelectionRange(0, 0);
    }, 0);

    setTimeout(nextCard, 200);
  } else {
    document.getElementById("answer").textContent = "Try again";
    input.select();
  }

  document.getElementById("count").textContent = `Score: ${correct}/${total}`;
}

async function loadDeckFromTxt() {
  const path = document.body.dataset.deck;
  if (!path) {
    throw new Error('Missing data-deck on <body>, e.g. <body data-deck="../decks/kana/kana.txt">');
  }

  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load deck file: ${path} (${res.status})`);
  }

  const rawText = await res.text();

  // Quiz deck parsing
  const parsed = parseDeckText(rawText);
  if (parsed.length === 0) {
    throw new Error("Deck loaded, but no valid entries were parsed.");
  }
  deck = parsed;

  // Bottom tables parsing + rendering
  const sections = parseDeckWithSections(rawText);
  renderDeckTablesFromSections(sections);

  return rawText;
}

document.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("input_box");

  // IME composition tracking
  input.addEventListener("compositionstart", () => { isComposing = true; });
  input.addEventListener("compositionend", () => { isComposing = false; });

  // Buttons
  document.getElementById("tool_next").addEventListener("click", () => {
    if (deck.length) nextCard();
  });

  document.getElementById("tool_hint").addEventListener("click", () => {
    if (deck.length) showHint();
  });

  // Enter to submit
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  });

  // Load deck + render
  try {
    await loadDeckFromTxt();
    render();
    input.focus();
  } catch (err) {
    console.error(err);
    document.getElementById("answer").textContent = "Error loading deck. Check console (F12).";
  }
});
