// --- Game State Variables ---
let currentDifficulty = "hard";
let gameRunning = false;
let isProcessing = false;
let firstCard = undefined;
let secondCard = undefined;

// --- Stats & Timer Variables ---
let clicks = 0;
let pairsMatched = 0;
let totalPairs = 0;
let timerInterval = null;
let timeLeft = 0;
let powerUpsLeft = 0;

async function getRandomPokemons(number) {
  const ids = [];
  for (let i = 0; i < number; i++) {
    let randomId = 0;
    do {
      randomId = Math.floor(Math.random() * 1025) + 1;
    } while (ids.includes(randomId) || randomId <= 0);
    ids.push(randomId);
  }

  const requests = ids.map((id) =>
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
  );
  const responses = await Promise.allSettled(requests);
  const successfulResponses = responses
    .filter((res) => res.status === "fulfilled")
    .map((res) => res.value);

  const pokemons = await Promise.all(
    successfulResponses.map((res) => res.json()),
  );
  return pokemons;
}

// --- Status Board Logic ---
function updateStatsUI() {
  $("#timer").text(timeLeft);
  $("#clicks").text(clicks);
  $("#matched").text(pairsMatched);
  $("#left").text(totalPairs - pairsMatched);
  $("#total").text(totalPairs);
  $("#power-ups").text(powerUpsLeft); // Update UI
}

function getInitialTime(difficulty) {
  switch (difficulty) {
    case "easy":
      return 30; // 30 seconds for 3 pairs
    case "medium":
      return 60; // 60 seconds for 6 pairs
    case "hard":
      return 100; // 100 seconds for 10 pairs
    default:
      return 60;
  }
}

function showMessage(msg) {
  $("#message-text").text(msg);
  $("#message-overlay").removeClass("hidden");
}

function endGame() {
  clearInterval(timerInterval);
  gameRunning = false;
  $("#start-btn").prop("disabled", false);
  $("#diff-btn").show();
}

// --- Type Color Mapping Palette ---
const TYPE_COLORS = {
  normal: "#A8A77A",
  fire: "#EE8130",
  water: "#6390F0",
  electric: "#F7D02C",
  grass: "#7AC74C",
  ice: "#96D9D6",
  fighting: "#C22E28",
  poison: "#A33EA1",
  ground: "#E2BF65",
  flying: "#A98FF3",
  psychic: "#F95587",
  bug: "#A6B91A",
  rock: "#B6A136",
  ghost: "#705746",
  dragon: "#6F35FC",
  dark: "#705746",
  steel: "#B7B7CE",
  fairy: "#D685AD",
};

async function setup(difficulty) {
  const grid = document.getElementById("game_grid");
  const loading = document.getElementById("loading");

  grid.innerHTML = "";
  grid.style.display = "none";
  loading.style.display = "block";
  grid.setAttribute("data-difficulty", difficulty);

  // Inside setup(difficulty) function:
  switch (difficulty) {
    case "hard":
      totalPairs = 10;
      powerUpsLeft = 2; // Hard: 2
      break;
    case "medium":
      totalPairs = 6;
      powerUpsLeft = 1; // Medium: 1
      break;
    case "easy":
      totalPairs = 3;
      powerUpsLeft = 0; // Easy: 0
      break;
  }

  clicks = 0;
  pairsMatched = 0;
  timeLeft = getInitialTime(difficulty);
  updateStatsUI();

  let pokeList = await getRandomPokemons(totalPairs);
  pokeList = shuffle(pokeList.concat(pokeList));

  let cardCounter = 1;
  pokeList.forEach((pokemon) => {
    const card = document.createElement("div");
    card.className = "card";

    const frontImg = document.createElement("img");
    frontImg.className = "front_face";
    frontImg.src = pokemon.sprites.other["official-artwork"].front_default;
    frontImg.id = "img" + cardCounter;
    cardCounter++;

    // --- NEW: Dynamic Type Background Logic ---
    // Extract type names from the payload structure: pokemon.types -> [{type: {name: '...'}}, ...]
    const types = pokemon.types.map((t) => t.type.name);

    if (types.length >= 2) {
      // Dual types: Create gradient from top left to bottom right using the first 2 types
      const color1 = TYPE_COLORS[types[0]] || "#ffffff";
      const color2 = TYPE_COLORS[types[1]] || "#ffffff";
      frontImg.style.background = `linear-gradient(to bottom right, ${color1}, ${color2})`;
    } else {
      // Single type: Solid color background
      const color1 = TYPE_COLORS[types[0]] || "#ffffff";
      frontImg.style.background = `linear-gradient(to bottom left, color-mix(in srgb, ${color1} 80%, white), color-mix(in srgb, ${color1} 80%, black))`;
    }

    const backImg = document.createElement("img");
    backImg.className = "back_face";
    backImg.src = "back.webp";

    card.appendChild(frontImg);
    card.appendChild(backImg);
    grid.appendChild(card);
  });

  loading.style.display = "none";
  grid.style.display = "grid";

  // Card Click Interaction Logic (Remains identical)
  $(".card").on("click", function () {
    if (!gameRunning || isProcessing || $(this).hasClass("flip")) return;

    clicks++;
    updateStatsUI();

    if (!firstCard) {
      firstCard = $(this).find(".front_face")[0];
      $(this).addClass("flip");
    } else {
      secondCard = $(this).find(".front_face")[0];
      $(this).addClass("flip");

      isProcessing = true;

      if (firstCard.src == secondCard.src) {
        pairsMatched++;
        updateStatsUI();

        $(`#${firstCard.id}`).parent().off("click");
        $(`#${secondCard.id}`).parent().off("click");
        firstCard = undefined;
        secondCard = undefined;
        isProcessing = false;

        if (pairsMatched === totalPairs) {
          endGame();
          showMessage(
            "You Win! 🎉\nScore: " +
              Math.floor((timeLeft * 1000) / Math.max(clicks, 1)),
          );
          $("#start-btn").prop("disabled", true);
        }
      } else {
        setTimeout(() => {
          $(`#${firstCard.id}`).parent().removeClass("flip");
          $(`#${secondCard.id}`).parent().removeClass("flip");
          firstCard = undefined;
          secondCard = undefined;
          isProcessing = false;
        }, 1000);
      }
    }
  });
}

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

// ----- Event Listeners for Controls -----
$(document).ready(() => {
  setup(currentDifficulty);

  // START Game
  $("#start-btn").on("click", function () {
    gameRunning = true;
    $(this).prop("disabled", true);
    $("#diff-btn").hide();

    // 1. Reset button state entirely
    $("#hint-btn").prop("disabled", false);

    // 2. Check if we should show it
    if (powerUpsLeft > 0) {
      $("#hint-btn").show();
    } else {
      $("#hint-btn").hide();
    }

    // Start Timer
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft--;
      updateStatsUI();

      // Check Lose Condition
      if (timeLeft <= 0) {
        endGame();
        showMessage("Time's Up! You Lose ⏰");
        $("#start-btn").prop("disabled", true);
        $("#hint-btn").hide(); // Hide hint
      }
    }, 1000);
  });

  // RESET Game
  $("#reset-btn").on("click", function () {
    endGame();
    setup(currentDifficulty);
    $("#hint-btn").hide(); // Hide hint button on reset
    $("#start-btn").prop("disabled", false);
  });

  // HINT Button Logic
  $("#hint-btn").on("click", function () {
    // Check if power-ups are available
    if (!gameRunning || isProcessing || powerUpsLeft <= 0) return;

    powerUpsLeft--; // Deduct one
    updateStatsUI();

    const btn = $(this);
    btn.prop("disabled", true);
    isProcessing = true;

    const unflippedCards = $(".card:not(.flip)");

    unflippedCards.each(function () {
      const frontImg = $(this).find(".front_face");
      const src = frontImg.attr("src");
      frontImg.css("-webkit-mask-image", `url('${src}')`);
      $(this).addClass("hint-active");
    });

    setTimeout(() => {
      unflippedCards.find(".front_face").css("opacity", "0");

      setTimeout(() => {
        unflippedCards.removeClass("hint-active");
        unflippedCards.find(".front_face").css({
          opacity: "",
          "-webkit-mask-image": "",
        });

        isProcessing = false;
        // Re-enable button only if we still have power-ups left
        if (powerUpsLeft > 0) btn.prop("disabled", false);
        else btn.prop("disabled", true);
      }, 500);
    }, 2000);
  });

  // DIFFICULTY Toggle
  $("#diff-btn").on("click", function () {
    if (gameRunning) return;

    const btn = $(this);
    btn.removeClass("btn-red btn-orange btn-yellow");

    if (currentDifficulty === "hard") {
      currentDifficulty = "easy";
      btn.addClass("btn-yellow").text("Easy");
    } else if (currentDifficulty === "easy") {
      currentDifficulty = "medium";
      btn.addClass("btn-orange").text("Medium");
    } else {
      currentDifficulty = "hard";
      btn.addClass("btn-red").text("Hard");
    }

    setup(currentDifficulty);
  });

  // THEME Toggle
  $("#theme-btn").on("click", function () {
    $("body").toggleClass("dark-mode");
    if ($("body").hasClass("dark-mode")) {
      $(this).text("Light Mode");
    } else {
      $(this).text("Dark Mode");
    }
  });

  // Overlay Close
  $("#close-msg-btn").on("click", function () {
    $("#message-overlay").addClass("hidden");
  });
});
