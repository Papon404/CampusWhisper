// ===============================
// SUPABASE CONNECTION
// ===============================

var SUPABASE_URL = "https://hymjvaypzpgxdhowgbdd.supabase.co";

var SUPABASE_KEY = "sb_publishable_6MxsFuOHZuT74xY0savo-Q_mnRGampB";

var supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

// Words that show a positive feeling
var positiveWords = [
  "good", "great", "excellent", "awesome", "nice", "happy",
  "love", "helpful", "thank", "best", "amazing", "proud"
];

// Words that show a negative feeling
var negativeWords = [
  "bad", "worst", "poor", "hate", "boring", "annoying",
  "angry", "sad", "terrible", "disappointed", "useless"
];

// Words that are not allowed at all
var abusiveWords = [
  "idiot", "stupid", "fool", "damn", "shut up", "moron"
];

// This array holds all the confessions.
// It gets loaded from Supabase when the page opens.
var confessions = [];

// This keeps track of which filter button is currently selected
var currentFilter = "All";

// This keeps track of what the user has typed in the search box
var currentSearch = "";


// ---------- Runs everything once the page has loaded ----------
document.addEventListener("DOMContentLoaded", async function () {
  await loadConfessionsFromSupabase();
  loadDarkModePreference();

  setupMenuButton();
  setupDarkModeButton();
  setupCharacterCounter();
  setupFormSubmit();
  setupFormReset();
  setupSearchBox();
  setupFilterButtons();

  displayConfessions();
});


//Load Confession from Supabase


async function loadConfessionsFromSupabase() {
  var result = await supabaseClient
    .from("confessions")
    .select("*")
    .order("created_at", { ascending: false });

  if (result.error) {
    console.error("Error loading confessions:", result.error);
    confessions = [];
    return;
  }

  confessions = result.data || [];

}


// DARK MODE


function loadDarkModePreference() {
  var darkModeOn = localStorage.getItem("campuswhisper_darkmode");

  if (darkModeOn === "yes") {
    document.body.classList.add("dark");
  }
}

function setupDarkModeButton() {
  var darkBtn = document.getElementById("darkModeBtn");

  darkBtn.addEventListener("click", function () {
    document.body.classList.toggle("dark");

    if (document.body.classList.contains("dark")) {
      localStorage.setItem("campuswhisper_darkmode", "yes");
    } else {
      localStorage.setItem("campuswhisper_darkmode", "no");
    }
  });
}



// MOBILE MENU


function setupMenuButton() {
  var menuBtn = document.getElementById("menuBtn");
  var navLinks = document.getElementById("navLinks");

  menuBtn.addEventListener("click", function () {
    navLinks.classList.toggle("show");
  });

  // Close the menu automatically when a link is clicked (mobile)
  var links = navLinks.querySelectorAll("a");
  for (var i = 0; i < links.length; i++) {
    links[i].addEventListener("click", function () {
      navLinks.classList.remove("show");
    });
  }
}



// CHARACTER COUNTER FOR THE MESSAGE BOX


function setupCharacterCounter() {
  var messageBox = document.getElementById("message");
  var charCount = document.getElementById("charCount");

  messageBox.addEventListener("input", function () {
    var length = messageBox.value.length;
    charCount.textContent = length + " / 500 characters";
  });
}



// FORM RESET


function setupFormReset() {
  var resetBtn = document.getElementById("resetBtn");
  var form = document.getElementById("confessionForm");

  form.addEventListener("reset", function () {
    // Wait a tiny moment so the form values actually clear first
    setTimeout(function () {
      document.getElementById("charCount").textContent = "0 / 500 characters";
      clearFormMessage();
    }, 10);
  });
}



// FORM SUBMIT (adding a new confession)


function setupFormSubmit() {
  var form = document.getElementById("confessionForm");

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    handleSubmit();
  });
}

  async function handleSubmit() {
  var category = document.getElementById("category").value;
  var department = document.getElementById("department").value;
  var year = document.getElementById("year").value;
  var messageBox = document.getElementById("message");
  var message = messageBox.value.trim();

  // Check that everything is filled in
  if (category === "" || department === "" || year === "") {
    showFormMessage("Please fill in all the dropdown fields.", "error");
    return;
  }

  if (message === "") {
    showFormMessage("Message cannot be empty.", "error");
    return;
  }

  if (message.length > 500) {
    showFormMessage("Message is too long. Please keep it under 500 characters.", "error");
    return;
  }

  // Run the sentiment check on the message
  var result = checkSentiment(message);

  if (result.blocked) {
    showFormMessage("This confession contains inappropriate language.", "error");
    return;
  }

  // Build the new confession object
 var newConfession = {
  category: category,
  department: department,
  year: year,
  message: message,
  sentiment: result.sentiment
};

var insertResult = await supabaseClient
  .from("confessions")
  .insert([newConfession])
  .select()
  .single();

if (insertResult.error) {
  console.error("Error submitting confession:", insertResult.error);

  showFormMessage(
    "Failed to submit confession. Please try again.",
    "error"
  );

  return;
}

confessions.unshift(insertResult.data);

  showFormMessage("Confession submitted successfully!", "success");

  document.getElementById("confessionForm").reset();
  document.getElementById("charCount").textContent = "0 / 500 characters";

  displayConfessions();

  // Scroll down to the board so the user can see their post
  setTimeout(function () {
    document.getElementById("board").scrollIntoView({ behavior: "smooth" });
  }, 600);
}

function showFormMessage(text, type) {
  var formMsg = document.getElementById("formMsg");
  formMsg.textContent = text;
  formMsg.className = "form-msg " + type;
}

function clearFormMessage() {
  var formMsg = document.getElementById("formMsg");
  formMsg.textContent = "";
  formMsg.className = "form-msg";
}



// SENTIMENT CHECKING LOGIC


function checkSentiment(message) {
  var lowerMessage = message.toLowerCase();

  // First check for abusive words - if found, block the post
  for (var i = 0; i < abusiveWords.length; i++) {
    if (lowerMessage.indexOf(abusiveWords[i]) !== -1) {
      return { blocked: true, sentiment: null };
    }
  }

  // Count how many positive and negative words appear
  var positiveCount = 0;
  var negativeCount = 0;

  for (var j = 0; j < positiveWords.length; j++) {
    if (lowerMessage.indexOf(positiveWords[j]) !== -1) {
      positiveCount++;
    }
  }

  for (var k = 0; k < negativeWords.length; k++) {
    if (lowerMessage.indexOf(negativeWords[k]) !== -1) {
      negativeCount++;
    }
  }

  // Decide the sentiment label based on the counts
  var sentimentLabel = "Neutral";

  if (positiveCount > negativeCount) {
    sentimentLabel = "Positive";
  } else if (negativeCount > positiveCount) {
    sentimentLabel = "Negative";
  }

  return { blocked: false, sentiment: sentimentLabel };
}



// DISPLAYING CONFESSIONS ON THE BOARD


function displayConfessions() {
  var boardList = document.getElementById("boardList");
  var emptyState = document.getElementById("emptyState");

  // Get the confessions that match the current filter and search text
  var visibleConfessions = getVisibleConfessions();

  // Clear the board before re-drawing it
  boardList.innerHTML = "";

  if (confessions.length === 0) {
    emptyState.style.display = "block";
    boardList.style.display = "none";
    return;
  }

  if (visibleConfessions.length === 0) {
    emptyState.style.display = "block";
    emptyState.querySelector("p").textContent = "No confessions match your search.";
    boardList.style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  boardList.style.display = "grid";

  for (var i = 0; i < visibleConfessions.length; i++) {
    var card = createConfessionCard(visibleConfessions[i]);
    boardList.appendChild(card);
  }
}

// Filters the confessions array based on currentFilter and currentSearch
function getVisibleConfessions() {
  var result = [];

  for (var i = 0; i < confessions.length; i++) {
    var item = confessions[i];

    // Check the category filter
    var matchesFilter = (currentFilter === "All" || item.category === currentFilter);

    // Check the search text (matches message, department or category)
    var searchLower = currentSearch.toLowerCase();
    var matchesSearch =
      item.message.toLowerCase().indexOf(searchLower) !== -1 ||
      item.department.toLowerCase().indexOf(searchLower) !== -1 ||
      item.category.toLowerCase().indexOf(searchLower) !== -1;

    if (matchesFilter && matchesSearch) {
      result.push(item);
    }
  }

  return result;
}

// Builds one confession card as an HTML element
function createConfessionCard(item) {
  var card = document.createElement("div");
  card.className = "card";

  var sentimentClass = "sentiment-" + item.sentiment;

  card.innerHTML =
    '<div class="card-top">' +
      '<span class="card-category">' + escapeText(item.category) + '</span>' +
      '<span class="card-sentiment ' + sentimentClass + '">' + escapeText(item.sentiment) + '</span>' +
    '</div>' +
    '<p class="card-message">' + escapeText(item.message) + '</p>' +
    '<div class="card-bottom">' +
      '<span>' + escapeText(item.department) + ' | ' + escapeText(item.year) + '</span>' +
      '<span>' + escapeText(new Date(item.created_at).toLocaleString()) + '</span>' +
    '</div>';

  return card;
}

// A very small helper to avoid raw HTML being injected from user text
function escapeText(text) {
  var div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}


// SEARCH BOX


function setupSearchBox() {
  var searchBox = document.getElementById("searchBox");

  searchBox.addEventListener("input", function () {
    currentSearch = searchBox.value.trim();
    displayConfessions();
  });
}



// FILTER BUTTONS


function setupFilterButtons() {
  var filterButtons = document.querySelectorAll(".filter-btn");

  for (var i = 0; i < filterButtons.length; i++) {
    filterButtons[i].addEventListener("click", function () {
      // Remove "active" class from all buttons
      for (var j = 0; j < filterButtons.length; j++) {
        filterButtons[j].classList.remove("active");
      }

      // Add "active" class to the clicked button
      this.classList.add("active");

      currentFilter = this.getAttribute("data-filter");
      displayConfessions();
    });
  }
}
