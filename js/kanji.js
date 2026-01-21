// Will most probably remove since this does the same as kana.js

let deck = [];

let currentIndex = 0;
let correct = 0;
let total = 0;

let isComposing = false;

function normalizeAnswer(s) {
  return (s ?? "").trim().toLowerCase();
}

/**
 * Parse deck entries for quiz usage (ignores # comments)
 * Supports:
 *  - "日","nichi|hi"
 *  - kana: "日", romaji: "nichi|hi"  (back-compat)
 */
function parseDeckText(text) {
  const lines = text.split(/\r?\n/);
  const out = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Preferred format: "char","answers"
    const simple = line.match(/^\s*"([^"]+)"\s*,\s*"([^"]+)"\s*$/);
    if (simple) {
      out.push({ char: simple[1], answers: simple[2] });
      continue;
    }

    // Backward-compatible format: kana: "日", romaji: "nichi"
    const kanaMatch = line.match(/kana\s*:\s*"([^"]+)"/);
    const romajiMatch = line.match(/romaji\s*:\s*"([^"]+)"/);
    if (kanaMatch && romajiMatch) {
      out.push({ char: kanaMatch[1], answers: romajiMatch[1] });
      continue;
    }

    console.warn("Skipping invalid deck line:", line);
  }

  return out;
}

/**
 * Parse deck into labeled sections based on # comment headers.
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

    if (line.startsWith("#")) {
      const title = line.replace(/^#+\s*/, "").trim();
      if (!title || /^=+$/.test(title)) continue;

      pushCurrentIfNotEmpty();
      current = { title, items: [] };
      continue;
    }

    const simple = line.match(/^\s*"([^"]+)"\s*,\s*"([^"]+)"\s*$/);
    if (simple) {
      current.items.push({ char: simple[1], answers: simple[2] });
      continue;
    }

    const kanaMatch = line.match(/kana\s*:\s*"([^"]+)"/);
    const romajiMatch = line.match(/romaji\s*:\s*"([^"]+)"/);
    if (kanaMatch && romajiMatch) {
      current.items.push({ char: kanaMatch[1], answers: romajiMatch[1] });
      continue;
    }

    console.warn("Skipping invalid section line:", line);
  }

  pushCurrentIfNotEmpty();
  return sections;
}

function renderDeckTablesFromSections(sections) {
  const host = document.getElementById("deckTables");
  if (!host) {
    console.warn('No element with id="deckTables" found in kanji.html');
    return;
  }

  host.innerHTML = "";
  const cols = 5;

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
          td.innerHTML = `<span class="kana">${item.char}</span><br><span class="romaji">${item.answers}</span>`;
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

  // Reuse existing IDs so your CSS layout stays identical
  document.getElementById("kana").textContent = deck[currentIndex].char;
  document.getElementById("answer").innerHTML = "&nbsp;";
  document.getElementById("count").textContent = `Score: ${correct}/${total}`;
}

function showHint() {
  if (deck.length === 0) return;
  document.getElementById("answer").textContent = `Hint: ${deck[currentIndex].answers}`;
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
  if (isComposing) return;

  const typedRaw = input.value.trim();
  const typedNorm = normalizeAnswer(typedRaw);

  const item = deck[currentIndex];
  const targetChar = item.char;

  const accepted = String(item.answers)
    .split("|")
    .map(normalizeAnswer)
    .filter(Boolean);

  // Correct if user types the kanji exactly OR any accepted reading
  const isCorrect = (typedRaw === targetChar) || accepted.includes(typedNorm);

  total++;

  if (isCorrect) {
    correct++;
    document.getElementById("answer").textContent = "Correct!";

    // IME-safe clear
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
    throw new Error('Missing data-deck on <body>, e.g. <body data-deck="../decks/kanji/kanji.txt">');
  }

  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to load deck file: ${path} (${res.status})`);
  }

  const rawText = await res.text();

  const parsed = parseDeckText(rawText);
  if (parsed.length === 0) {
    throw new Error("Deck loaded, but no valid entries were parsed.");
  }
  deck = parsed;

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

  // Load + render
  try {
    await loadDeckFromTxt();
    render();
    input.focus();
  } catch (err) {
    console.error(err);
    document.getElementById("answer").textContent = "Error loading deck. Check console (F12).";
  }
});