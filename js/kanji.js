// Will most probably remove since this does the same as kana.js

const deck = [
    { kanji: "日", reading: "nichi" },
    { kanji: "月", reading: "getsu" },
    { kanji: "山", reading: "yama" },
    { kanji: "川", reading: "kawa" },
    { kanji: "人", reading: "hito" },
    { kanji: "水", reading: "mizu" },
    { kanji: "火", reading: "hi" },
    { kanji: "木", reading: "ki" }
  ];
  
  let currentIndex = 0;
  let correct = 0;
  let total = 0;
  
  function pickRandomNext() {
    if (deck.length <= 1) return 0;
    let next;
    do {
      next = Math.floor(Math.random() * deck.length);
    } while (next === currentIndex);
    return next;
  }
  
  function render() {
    document.getElementById("kana").textContent = deck[currentIndex].kanji; // reusing the same ID
    document.getElementById("answer").innerHTML = "&nbsp;";
    document.getElementById("count").textContent = `Score: ${correct}/${total}`;
  }
  
  function showHint() {
    document.getElementById("answer").textContent = `Hint: ${deck[currentIndex].reading}`;
  }
  
  function nextCard() {
    currentIndex = pickRandomNext();
    render();
    document.getElementById("input_box").focus();
  }
  
  function handleSubmit() {
    const input = document.getElementById("input_box");
    const typed = input.value.trim();
    const target = deck[currentIndex].reading;
  
    total++;
  
    if (typed === target) {
      correct++;
      document.getElementById("answer").textContent = "Correct!";
      input.value = "";
      setTimeout(nextCard, 250);
    } else {
      document.getElementById("answer").textContent = "Try again";
      input.select();
    }
  
    document.getElementById("count").textContent = `Score: ${correct}/${total}`;
  }
  
  document.addEventListener("DOMContentLoaded", () => {
    render();
    document.getElementById("tool_next").addEventListener("click", nextCard);
    document.getElementById("tool_hint").addEventListener("click", showHint);
    document.getElementById("input_box").addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleSubmit();
    });
  });
  