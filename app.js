const state = {
  leads: JSON.parse(localStorage.getItem("ach_leads") || "[]"),
  settings: JSON.parse(localStorage.getItem("ach_settings") || "{}")
};

const $ = id => document.getElementById(id);


function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}


/* =========================
   STORAGE
========================= */

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


/* =========================
   NAVIGATION
========================= */

document.querySelectorAll("nav button").forEach(button => {

  button.addEventListener("click", () => {

    document.querySelectorAll("nav button")
      .forEach(x => x.classList.remove("active"));

    document.querySelectorAll(".page")
      .forEach(x => x.classList.remove("active"));

    button.classList.add("active");

    const page = $(button.dataset.page);

    if (page) {
      page.classList.add("active");
    }

    if ($("title")) {
      $("title").textContent =
        button.textContent.trim();
    }

  });

});


/* =========================
   ADD LEAD MODAL
========================= */

function openModal() {

  if ($("modal")) {
    $("modal").classList.add("show");
  }

}


function closeModal() {

  if ($("modal")) {
    $("modal").classList.remove("show");
  }

}


$("add")?.addEventListener("click", openModal);

$("close")?.addEventListener("click", closeModal);

document.querySelectorAll(".add").forEach(button => {
  button.addEventListener("click", openModal);
});


/* =========================
   ADD MANUAL LEAD
========================= */

$("form")?.addEventListener("submit", event => {

  event.preventDefault();

  const name =
    $("business")?.value.trim();

  if (!name) return;

  const website =
    $("website")?.value.trim() || "";

  const location =
    $("location")?.value.trim() || "";

  const score =
    Number($("score")?.value || 55);

  const value =
    Number($("potential")?.value || 500);

  state.leads.push({

    id:
      crypto.randomUUID
        ? crypto.randomUUID()
        : String(Date.now()),

    name,

    web: website || "—",

    location,

    phone: "",

    score,

    status:
      score >= 75
        ? "Hot"
        : score >= 55
          ? "Warm"
          : "Cold",

    value,

    source: "Manual",

    analyzed: false

  });

  saveLeads();

  closeModal();

  event.target.reset();

  if ($("potential")) {
    $("potential").value = 500;
  }

  render();

});


/* =========================
   DISCOVERY
========================= */

$("discoverBtn")?.addEventListener(
  "click",
  () => {

    const form =
      $("discoveryForm");

    if (!form) return;

    form.style.display =
      form.style.display === "none"
        ? "block"
        : "none";

  }
);


$("runDiscovery")?.addEventListener(
  "click",
  discoverLeads
);


async function discoverLeads() {

  const niche =
    $("discoveryNiche")?.value.trim();

  const location =
    $("discoveryLocation")?.value.trim();

  const limit =
    Number($("discoveryLimit")?.value || 5);

  const status =
    $("discoveryStatus");

  const results =
    $("discoveryResults");

  if (!niche || !location) {

    if (status) {
      status.innerHTML =
        `<div class="warning">
          Enter business type and location.
        </div>`;
    }

    return;
  }

  if (status) {
    status.innerHTML =
      `<div class="muted">
        Searching public business listings...
      </div>`;
  }

  if (results) {
    results.innerHTML = "";
  }

  try {

    const response =
      await fetch("./api/discover", {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          niche,
          location,
          limit
        })

      });


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.error ||
        "Discovery failed."
      );
    }


    const leads =
      data.leads || [];


    if (!leads.length) {

      status.innerHTML =
        `<div class="warning">
          No suitable prospects found.
        </div>`;

      return;
    }


    status.innerHTML =
      `<div class="success">
        Found ${leads.length} prospects.
      </div>`;


    renderDiscoveryResults(leads);

  }

  catch (error) {

    console.error(error);

    status.innerHTML =
      `<div class="warning">
        Error: ${esc(error.message)}
      </div>`;

  }

}


/* =========================
   DISCOVERY RESULTS
========================= */

function renderDiscoveryResults(leads) {

  const results =
    $("discoveryResults");

  if (!results) return;


  results.innerHTML = `

    <div class="discovery-list">

      ${leads.map((lead, index) => `

        <div class="prospect">

          <div>

            <b>
              ${esc(lead.name)}
            </b>

            <small>
              ${esc(lead.location || "")}
            </small>

            ${
              lead.website
                ? `
                  <a
                    href="${esc(lead.website)}"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit website
                  </a>
                `
                : `
                  <small>
                    No website detected
                  </small>
                `
            }

          </div>


          <div class="prospect-score">

            <b>
              ${lead.score}/100
            </b>

            <small>
              ${esc(lead.status)}
            </small>

            <button
              class="addDiscovered"
              data-index="${index}"
            >
              Add Lead
            </button>

          </div>

        </div>

      `).join("")}

    </div>


    <button id="addAllDiscovered">
      Add All
    </button>

  `;


  document
    .querySelectorAll(".addDiscovered")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          const lead =
            leads[
              Number(button.dataset.index)
            ];

          if (
            addDiscoveredLead(lead)
          ) {

            button.textContent =
              "Added ✓";

            button.disabled = true;

          }

        }
      );

    });


  $("addAllDiscovered")
    ?.addEventListener(
      "click",
      () => {

        let added = 0;

        leads.forEach(lead => {

          if (
            addDiscoveredLead(lead)
          ) {
            added++;
          }

        });


        render();


        $("discoveryStatus").innerHTML =
          `<div class="success">
            ${added} new leads added.
          </div>`;

      }
    );

}


/* =========================
   ADD DISCOVERED LEAD
========================= */

function addDiscoveredLead(lead) {

  const duplicate =
    state.leads.some(existing => {

      const sameWebsite =
        lead.website &&
        existing.web &&
        lead.website !== "—" &&
        existing.web !== "—" &&
        lead.website.toLowerCase() ===
          existing.web.toLowerCase();

      const sameName =
        lead.name &&
        existing.name &&
        lead.name.toLowerCase() ===
          existing.name.toLowerCase();

      return sameWebsite || sameName;

    });


  if (duplicate) {
    return false;
  }


  state.leads.push({

    id:
      lead.id ||
      String(Date.now()),

    name:
      lead.name,

    web:
      lead.website ||
      "—",

    location:
      lead.location ||
      "",

    phone:
      lead.phone ||
      "",

    score:
      Number(lead.score || 0),

    status:
      lead.status ||
      "Warm",

    value:
      Number(lead.value || 500),

    source:
      lead.source ||
      "OpenStreetMap",

    opportunity:
      lead.opportunity ||
      "",

    analyzed:
      false

  });


  saveLeads();

  render();

  return true;

}


/* =========================
   WEBSITE ANALYSIS
========================= */

async function analyzeLead(id) {

  const lead =
    state.leads.find(
      x => String(x.id) === String(id)
    );

  if (!lead) return;


  const modal =
    $("analysisModal");

  const title =
    $("analysisTitle");

  const content =
    $("analysisContent");


  modal.classList.add("show");

  title.textContent =
    lead.name;


  content.innerHTML = `
    <div class="analysis-loading">
      <b>Analyzing website...</b>
      <p class="muted">
        Checking public website signals.
      </p>
    </div>
  `;


  if (
    !lead.web ||
    lead.web === "—"
  ) {

    content.innerHTML = `
      <div class="warning">
        <b>No website detected.</b>

        <p>
          This can be a strong website opportunity,
          but the business should still be manually verified
          before outreach.
        </p>
      </div>

      <div class="analysis-score">
        <span>Opportunity score</span>
        <b>85/100</b>
      </div>
    `;

    lead.score =
      Math.max(
        Number(lead.score || 0),
        85
      );

    lead.status = "Hot";

    lead.value = 500;

    lead.analyzed = true;

    saveLeads();
    render();

    return;
  }


  try {

    const response =
      await fetch("./api/analyze", {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          id: lead.id,
          name: lead.name,
          website: lead.web
        })

      });


    const data =
      await response.json();


    if (!response.ok) {
      throw new Error(
        data.error ||
        "Website analysis failed."
      );
    }


    lead.analysis =
      data.analysis;

    lead.score =
      Number(data.analysis.score);

    lead.status =
      data.analysis.status;

    lead.value =
      Number(data.analysis.value);

    lead.analyzed =
      true;


    saveLeads();

    render();

    showAnalysis(data.analysis);

  }

  catch (error) {

    content.innerHTML =
      `<div class="warning">
        ${esc(error.message)}
      </div>`;

  }

}


/* =========================
   SHOW ANALYSIS
========================= */

function showAnalysis(analysis) {

  $("analysisContent").innerHTML = `

    <div class="analysis-score">

      <span>Qualification score</span>

      <b>
        ${analysis.score}/100
      </b>

      <strong>
        ${esc(analysis.status)}
      </strong>

    </div>


    <div class="analysis-grid">

      <div>
        <small>HTTPS</small>
        <b>
          ${analysis.https ? "✓ Yes" : "✕ No"}
        </b>
      </div>

      <div>
        <small>Website reachable</small>
        <b>
          ${analysis.reachable ? "✓ Yes" : "✕ No"}
        </b>
      </div>

      <div>
        <small>Mobile viewport</small>
        <b>
          ${analysis.mobile ? "✓ Detected" : "✕ Not detected"}
        </b>
      </div>

      <div>
        <small>Title</small>
        <b>
          ${analysis.title
            ? esc(analysis.title)
            : "Missing"}
        </b>
      </div>

    </div>


    <div class="analysis-section">

      <h3>Opportunity</h3>

      <p>
        ${esc(analysis.opportunity)}
      </p>

    </div>


    <div class="analysis-section">

      <h3>Reasons</h3>

      <ul>

        ${
          (analysis.reasons || [])
            .map(
              reason =>
                `<li>${esc(reason)}</li>`
            )
            .join("")
        }

      </ul>

    </div>


    <div class="analysis-section">

      <h3>Recommended project</h3>

      <p>
        <b>
          $${Number(
            analysis.value
          ).toLocaleString()}
        </b>
      </p>

    </div>

  `;

}


/* =========================
   CLOSE ANALYSIS
========================= */

$("closeAnalysis")
  ?.addEventListener(
    "click",
    () => {

      $("analysisModal")
        .classList.remove("show");

    }
  );


/* =========================
   RENDER
========================= */

function render() {

  const leads =
    state.leads;


  $("total").textContent =
    leads.length;


  $("hot").textContent =
    leads.filter(
      x =>
        Number(x.score || 0) >= 75
    ).length;


  $("msgs").textContent =
    leads.length;


  const totalValue =
    leads.reduce(
      (sum, lead) =>
        sum +
        Number(lead.value || 0),
      0
    );


  $("value").textContent =
    "$" +
    totalValue.toLocaleString();


  $("rows").innerHTML =
    leads.length

      ? leads.map(lead => `

        <tr>

          <td>
            <b>
              ${esc(lead.name)}
            </b>
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

                : "No website"
            }

          </td>

          <td>
            <b>
              ${Number(lead.score || 0)}/100
            </b>
          </td>

          <td>
            ${esc(
              lead.status || "Warm"
            )}
          </td>

          <td>
            $${Number(
              lead.value || 0
            ).toLocaleString()}
          </td>

          <td>

            ${
              lead.web &&
              lead.web !== "—"

                ? `
                  <button
                    class="analyzeBtn"
                    data-id="${esc(lead.id)}"
                  >
                    ${
                      lead.analyzed
                        ? "Re-analyze"
                        : "Analyze"
                    }
                  </button>
                `

                : `
                  <button
                    class="analyzeBtn"
                    data-id="${esc(lead.id)}"
                  >
                    Qualify
                  </button>
                `
            }

          </td>

        </tr>

      `).join("")

      : `

        <tr>

          <td
            colspan="7"
            class="empty"
          >
            No leads yet.
            Find prospects first.

          </td>

        </tr>

      `;


  document
    .querySelectorAll(".analyzeBtn")
    .forEach(button => {

      button.addEventListener(
        "click",
        () => {

          analyzeLead(
            button.dataset.id
          );

        }
      );

    });


  $("out").innerHTML =
    leads.length

      ? leads
          .filter(
            lead =>
              Number(lead.score || 0) >= 55
          )
          .map(lead => `

            <div class="card outreachcard">

              <div class="cardhead">

                <b>
                  ${esc(lead.name)}
                </b>

                <small>
                  ${esc(
                    lead.status ||
                    "Warm"
                  )}
                </small>

              </div>

              <p>

                ${
                  lead.analysis?.opportunity
                    ? esc(
                        lead.analysis.opportunity
                      )
                    : "Analyze this lead to generate a more specific outreach angle."
                }

              </p>

            </div>

          `)
          .join("")

      : `
        <div class="card empty">
          No qualified leads yet.
        </div>
      `;

}


/* =========================
   SETTINGS
========================= */

function loadSettings() {

  if (!$("settingMinimum")) {
    return;
  }

  $("settingMinimum").value =
    state.settings.minimum ||
    250;

  $("settingStandard").value =
    state.settings.standard ||
    500;

  $("settingCustom").value =
    state.settings.custom ||
    1000;

  $("settingDaily").value =
    state.settings.daily ||
    20;

}


$("save")?.addEventListener(
  "click",
  () => {

    state.settings = {

      minimum:
        $("settingMinimum").value,

      standard:
        $("settingStandard").value,

      custom:
        $("settingCustom").value,

      daily:
        $("settingDaily").value

    };

    saveSettings();

    alert(
      "Settings saved."
    );

  }
);


/* =========================
   PWA
========================= */

let deferredPrompt = null;


window.addEventListener(
  "beforeinstallprompt",
  event => {

    event.preventDefault();

    deferredPrompt = event;

    $("install")
      ?.classList.remove(
        "hidden"
      );

  }
);


$("install")
  ?.addEventListener(
    "click",
    async () => {

      if (!deferredPrompt) {
        return;
      }

      deferredPrompt.prompt();

      await deferredPrompt.userChoice;

      deferredPrompt = null;

      $("install")
        ?.classList.add(
          "hidden"
        );

    }
  );


/* =========================
   SERVICE WORKER
========================= */

if (
  "serviceWorker" in navigator &&
  location.protocol !== "file:"
) {

  navigator.serviceWorker
    .register("./sw.js")
    .catch(
      error =>
        console.error(
          "Service Worker:",
          error
        )
    );

}


/* =========================
   START
========================= */

loadSettings();

render();
