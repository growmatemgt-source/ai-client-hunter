```javascript
const state = {
  leads: JSON.parse(localStorage.getItem("ach_leads") || "[]"),
  settings: JSON.parse(
    localStorage.getItem("ach_settings") ||
    JSON.stringify({
      min: 250,
      standard: 500,
      custom: 1000,
      daily: 20
    })
  )
};


const $ = id => document.getElementById(id);


function esc(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    m => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[m])
  );
}


function saveLeads() {
  localStorage.setItem(
    "ach_leads",
    JSON.stringify(state.leads)
  );
}


function saveSettings() {
  localStorage.setItem(
    "ach_settings",
    JSON.stringify(state.settings)
  );
}


/* -----------------------------
   NAVIGATION
----------------------------- */

document.querySelectorAll("nav button").forEach(button => {

  button.onclick = () => {

    document
      .querySelectorAll("nav button")
      .forEach(x => x.classList.remove("active"));

    document
      .querySelectorAll(".page")
      .forEach(x => x.classList.remove("active"));

    button.classList.add("active");

    $(button.dataset.page).classList.add("active");

    $("title").textContent = button.textContent.trim();
  };

});



/* -----------------------------
   ADD LEAD
----------------------------- */

function openModal() {
  $("modal").classList.add("show");
}


function closeModal() {
  $("modal").classList.remove("show");
}


$("add").onclick = openModal;

document.querySelector(".add").onclick = openModal;

$("close").onclick = closeModal;


$("form").onsubmit = event => {

  event.preventDefault();

  const lead = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(),

    name: $("business").value.trim(),

    location:
      $("location").value.trim() || "Unknown",

    web:
      $("website").value.trim() || "—",

    score:
      Number($("score").value),

    value:
      Number($("potential").value) ||
      state.settings.standard,

    source: "manual",

    status: "New",

    createdAt: new Date().toISOString()
  };


  state.leads.unshift(lead);

  saveLeads();

  closeModal();

  event.target.reset();

  $("potential").value = state.settings.standard;

  render();
};



/* -----------------------------
   DISCOVERY MODAL
----------------------------- */

function openDiscovery() {
  $("discoverModal").classList.add("show");
}


function closeDiscovery() {
  $("discoverModal").classList.remove("show");
}


$("discoverBtn").onclick = openDiscovery;

$("discoverBtn2").onclick = openDiscovery;

$("discoverClose").onclick = closeDiscovery;



/* -----------------------------
   DISCOVER LEADS
----------------------------- */

$("discoverForm").onsubmit = async event => {

  event.preventDefault();

  const niche =
    $("discoverNiche").value.trim();

  const location =
    $("discoverLocation").value.trim();

  const limit =
    Number($("discoverLimit").value) || 10;


  const results = $("discoverResults");

  results.innerHTML = `
    <div class="discoverLoading">
      Searching legitimate public business data...
    </div>
  `;


  try {

    const response = await fetch(
      "./api/discover",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify({
          niche,
          location,
          limit
        })
      }
    );


    const data = await response.json();


    if (!response.ok) {
      throw new Error(
        data.error ||
        "Lead discovery failed."
      );
    }


    if (!Array.isArray(data.leads) || !data.leads.length) {

      results.innerHTML = `
        <div class="empty">
          No suitable prospects found.
          Try another niche or location.
        </div>
      `;

      return;
    }


    results.innerHTML = `

      <div class="discoveryTop">

        <b>
          ${data.leads.length} prospects found
        </b>

        <button id="addAllDiscovered">
          Add All
        </button>

      </div>


      <div class="discoveryList">

        ${data.leads.map((lead, index) => `

          <div
            class="discoveryItem"
            data-index="${index}"
          >

            <div>

              <strong>
                ${esc(lead.name)}
              </strong>

              <small>
                ${esc(lead.location || "")}
              </small>

              <small>
                ${esc(lead.website || "No website found")}
              </small>

            </div>


            <div class="discoveryScore">

              <b>
                ${lead.score}/100
              </b>

              <span>
                ${lead.status}
              </span>

            </div>


            <button
              class="addDiscovered"
              data-index="${index}"
            >
              Add
            </button>

          </div>

        `).join("")}

      </div>

      <small class="sourceNote">
        Data source: OpenStreetMap contributors.
      </small>
    `;


    document
      .querySelectorAll(".addDiscovered")
      .forEach(button => {

        button.onclick = () => {

          const lead =
            data.leads[
              Number(button.dataset.index)
            ];

          addDiscoveredLead(lead);

          button.textContent = "Added";

          button.disabled = true;
        };

      });


    $("addAllDiscovered").onclick = () => {

      data.leads.forEach(addDiscoveredLead);

      render();

      $("addAllDiscovered").textContent =
        "Added";

      $("addAllDiscovered").disabled =
        true;

      document
        .querySelectorAll(".addDiscovered")
        .forEach(button => {

          button.textContent = "Added";

          button.disabled = true;

        });

    };


  } catch (error) {

    results.innerHTML = `
      <div class="errorBox">
        ${esc(error.message)}
      </div>
    `;

  }

};



/* -----------------------------
   ADD DISCOVERED LEAD
----------------------------- */

function addDiscoveredLead(lead) {

  const exists = state.leads.some(existing => {

    const existingName =
      String(existing.name || "")
        .toLowerCase()
        .trim();

    const newName =
      String(lead.name || "")
        .toLowerCase()
        .trim();

    const existingWeb =
      String(existing.web || "")
        .toLowerCase()
        .trim();

    const newWeb =
      String(lead.website || "")
        .toLowerCase()
        .trim();


    return (
      (newWeb &&
        newWeb !== "—" &&
        existingWeb === newWeb)
      ||
      existingName === newName
    );

  });


  if (exists) return;


  state.leads.unshift({

    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Date.now().toString(),

    name: lead.name,

    location:
      lead.location || "Unknown",

    web:
      lead.website || "—",

    score:
      Number(lead.score) || 50,

    value:
      Number(lead.value) ||
      state.settings.standard,

    status:
      lead.status || "New",

    source:
      "OpenStreetMap",

    websiteStatus:
      lead.websiteStatus || "Unknown",

    opportunity:
      lead.opportunity || "",

    createdAt:
      new Date().toISOString()

  });


  saveLeads();

  render();
}



/* -----------------------------
   RENDER
----------------------------- */

function render() {

  const leads = state.leads;


  $("total").textContent =
    leads.length;


  $("hot").textContent =
    leads.filter(
      lead => Number(lead.score) >= 75
    ).length;


  $("msgs").textContent =
    leads.length;


  $("value").textContent =
    "$" +
    leads
      .reduce(
        (total, lead) =>
          total + Number(lead.value || 0),
        0
      )
      .toLocaleString();


  $("rows").innerHTML =
    leads.length

      ? leads.map(lead => `

        <tr>

          <td>
            <b>${esc(lead.name)}</b>
          </td>

          <td>
            ${esc(lead.location || "—")}
          </td>

          <td>
            ${
              lead.web &&
              lead.web !== "—"

                ? `
                  <a
                    href="${esc(lead.web)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Website
                  </a>
                `

                : "—"
            }
          </td>

          <td>
            ${Number(lead.score)}/100
          </td>

          <td>
            <span class="status">
              ${esc(
                lead.status ||
                (
                  lead.score >= 75
                    ? "Hot"
                    : "Warm"
                )
              )}
            </span>
          </td>

          <td>
            $${Number(
              lead.value || 0
            ).toLocaleString()}
          </td>

        </tr>

      `).join("")

      : `
        <tr>
          <td
            colspan="6"
            class="empty"
          >
            No leads yet.
            Find your first prospects.
          </td>
        </tr>
      `;


  $("out").innerHTML =

    leads.length

      ? leads.map(lead => `

        <div class="card outreachcard">

          <b>
            ${esc(lead.name)}
          </b>

          <p>
            Hi ${esc(lead.name)},
            I came across your business and
            noticed an opportunity to improve
            the website experience.
            I build modern websites and web
            apps for businesses.
            If you're open to it, I can send
            a few specific ideas.
          </p>

          <small class="muted">
            Suggested project:
            $${Number(
              lead.value || state.settings.standard
            ).toLocaleString()}
          </small>

        </div>

      `).join("")

      : `
        <div class="card empty">
          No outreach drafts yet.
        </div>
      `;

}



/* -----------------------------
   SETTINGS
----------------------------- */

function loadSettings() {

  $("minPrice").value =
    state.settings.min;

  $("standardPrice").value =
    state.settings.standard;

  $("customPrice").value =
    state.settings.custom;

  $("dailyLimit").value =
    state.settings.daily;

}


$("save").onclick = () => {

  state.settings = {

    min:
      Number($("minPrice").value) || 250,

    standard:
      Number($("standardPrice").value) || 500,

    custom:
      Number($("customPrice").value) || 1000,

    daily:
      Number($("dailyLimit").value) || 20

  };


  saveSettings();

  alert(
    "Settings saved locally."
  );

  render();

};



/* -----------------------------
   PWA INSTALL
----------------------------- */

let deferredPrompt;


window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredPrompt = event;

    $("install")
      .classList
      .remove("hidden");

  }
);


$("install").onclick = async () => {

  if (!deferredPrompt) return;

  deferredPrompt.prompt();

  await deferredPrompt.userChoice;

  deferredPrompt = null;

  $("install")
    .classList
    .add("hidden");

};



/* -----------------------------
   SERVICE WORKER
----------------------------- */

if (
  "serviceWorker" in navigator &&
  location.protocol !== "file:"
) {

  navigator.serviceWorker
    .register("./sw.js")
    .catch(console.error);

}



/* -----------------------------
   START
----------------------------- */

loadSettings();

render();
```
