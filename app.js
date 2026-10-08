const $ = (id) => document.getElementById(id);

function readJSON(key, fallback = []) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

const state = {
  leads: readJSON("ach_leads", []),
  settings: readJSON("ach_settings", {
    minimum: 250,
    standard: 500,
    custom: 1000,
    daily: 20
  }),
  discovery: readJSON("ach_discovery", [])
};

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

function saveLeads() {
  localStorage.setItem("ach_leads", JSON.stringify(state.leads));
}

function saveDiscovery() {
  localStorage.setItem("ach_discovery", JSON.stringify(state.discovery));
}

function saveSettings() {
  localStorage.setItem("ach_settings", JSON.stringify(state.settings));
}

/* =========================
   NAVIGATION
========================= */

document.querySelectorAll("nav button").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach((x) => {
      x.classList.remove("active");
    });

    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });

    button.classList.add("active");

    const page = $(button.dataset.page);

    if (page) {
      page.classList.add("active");
    }

    if ($("title")) {
      $("title").textContent = button.textContent.trim();
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

if ($("add")) {
  $("add").onclick = openModal;
}

if ($("close")) {
  $("close").onclick = closeModal;
}

document.querySelectorAll(".add").forEach((button) => {
  button.addEventListener("click", openModal);
});

if ($("form")) {
  $("form").onsubmit = (e) => {
    e.preventDefault();

    const score = Number($("score")?.value || 55);

    const lead = {
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Date.now().toString(),

      name: $("business")?.value.trim() || "Unknown Business",
      location: $("leadLocation")?.value.trim() || "",
      web: $("website")?.value.trim() || "",
      score,
      status:
        score >= 75
          ? "Hot"
          : score >= 55
            ? "Warm"
            : "Cold",
      value: Number($("potential")?.value || 500),
      source: "Manual",
      analysis: null,
      analyzedAt: null
    };

    state.leads.push(lead);
    saveLeads();

    closeModal();

    e.target.reset();

    if ($("potential")) {
      $("potential").value = 500;
    }

    render();
  };
}

/* =========================
   DISCOVERY ELEMENTS
========================= */

function getDiscoveryElements() {
  return {
    niche:
      $("niche") ||
      $("discoverNiche") ||
      $("searchNiche"),

    location:
      $("location") ||
      $("discoverLocation") ||
      $("searchLocation"),

    limit:
      $("limit") ||
      $("discoverLimit") ||
      $("searchLimit"),

    results:
      $("discoveryResults") ||
      $("discoverResults") ||
      $("results"),

    status:
      $("leadStatus") ||
      $("discoveryStatus")
  };
}

function setDiscoveryStatus(message, type = "") {
  const el = getDiscoveryElements().status;

  if (!el) return;

  el.textContent = message;
  el.className = `discovery-status ${type}`.trim();
}

function scoreClass(score) {
  if (score >= 75) return "hot";
  if (score >= 55) return "warm";
  return "cold";
}

function statusLabel(score, status) {
  if (status) return status;

  if (score >= 75) return "Hot";
  if (score >= 55) return "Warm";

  return "Cold";
}

function formatValue(value) {
  return "$" + Number(value || 0).toLocaleString();
}

/* =========================
   DISCOVERY RESULTS
========================= */

function renderDiscoveryResults() {
  const { results } = getDiscoveryElements();

  if (!results) return;

  if (!state.discovery.length) {
    results.innerHTML = `
      <div class="discovery-empty">
        <div class="discovery-empty-icon">⌕</div>
        <strong>No prospects yet</strong>
        <span>
          Search for a niche and location to discover potential clients.
        </span>
      </div>
    `;

    return;
  }

  results.innerHTML = `
    <div class="discovery-results-head">

      <div>
        <strong>
          ${state.discovery.length} prospects found
        </strong>

        <span>
          Review each prospect before adding it to your pipeline.
        </span>
      </div>

      <button
        type="button"
        class="add-all-btn"
        id="addAllDiscovered"
      >
        Add all
      </button>

    </div>

    <div class="discovery-list">

      ${state.discovery.map((lead, index) => {

        const score = Number(lead.score || 0);
        const status = statusLabel(score, lead.status);
        const cls = scoreClass(score);

        const alreadyAdded = state.leads.some((existing) => {

          const sameWebsite =
            lead.website &&
            existing.web &&
            lead.website !== "—" &&
            existing.web !== "—" &&
            lead.website.replace(/\/$/, "") ===
              existing.web.replace(/\/$/, "");

          const sameName =
            lead.name &&
            existing.name &&
            lead.name.toLowerCase() ===
              existing.name.toLowerCase();

          return sameWebsite || sameName;
        });

        return `
          <article
            class="lead-result-card ${alreadyAdded ? "is-added" : ""}"
          >

            <div class="lead-result-main">

              <div class="lead-result-top">

                <div class="lead-number">
                  ${String(index + 1).padStart(2, "0")}
                </div>

                <div class="lead-identity">

                  <h4>
                    ${esc(lead.name || "Unknown Business")}
                  </h4>

                  <div class="lead-meta">

                    <span class="meta-location">
                      <span class="meta-icon">⌖</span>
                      ${esc(
                        lead.location ||
                        "Location unavailable"
                      )}
                    </span>

                    ${
                      lead.website
                        ? `
                          <a
                            href="${esc(lead.website)}"
                            target="_blank"
                            rel="noopener noreferrer"
                            class="meta-website"
                          >
                            Website ↗
                          </a>
                        `
                        : `
                          <span class="meta-muted">
                            No website detected
                          </span>
                        `
                    }

                  </div>

                </div>

              </div>

              <div class="lead-result-opportunity">
                <span>
                  ${esc(
                    lead.opportunity ||
                    "Potential website development opportunity."
                  )}
                </span>
              </div>

            </div>

            <div class="lead-result-score">

              <div class="score-circle ${cls}">
                <strong>${score}</strong>
                <span>/100</span>
              </div>

              <div class="score-info">

                <span class="lead-status ${cls}">
                  ${esc(status)}
                </span>

                <strong class="lead-value">
                  ${formatValue(lead.value || 250)}
                </strong>

                <small>
                  Potential project
                </small>

              </div>

            </div>

            <div class="lead-result-action">

              ${
                alreadyAdded
                  ? `
                    <button
                      type="button"
                      class="added-btn"
                      disabled
                    >
                      ✓ Added
                    </button>
                  `
                  : `
                    <button
                      type="button"
                      class="add-lead-btn"
                      data-discovery-index="${index}"
                    >
                      Add Lead
                    </button>
                  `
              }

            </div>

          </article>
        `;
      }).join("")}

    </div>
  `;

  const addAll = $("addAllDiscovered");

  if (addAll) {
    addAll.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();

      addAllDiscovered();
    });
  }
}

/* =========================
   ADD DISCOVERED LEAD
========================= */

function addDiscoveredLead(index) {
  const lead = state.discovery[index];

  if (!lead) return;

  const duplicate = state.leads.some((existing) => {

    const sameWebsite =
      lead.website &&
      existing.web &&
      lead.website !== "—" &&
      existing.web !== "—" &&
      lead.website.replace(/\/$/, "") ===
        existing.web.replace(/\/$/, "");

    const sameName =
      lead.name &&
      existing.name &&
      lead.name.toLowerCase() ===
        existing.name.toLowerCase();

    return sameWebsite || sameName;
  });

  if (duplicate) {
    renderDiscoveryResults();
    return;
  }

  const newLead = {
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${index}`,

    name: lead.name || "Unknown Business",
    location: lead.location || "",
    web: lead.website || "",
    score: Number(lead.score || 0),

    status:
      lead.status ||
      statusLabel(Number(lead.score || 0)),

    value: Number(lead.value || 250),

    source:
      lead.source ||
      "OpenStreetMap",

    phone: lead.phone || "",

    opportunity:
      lead.opportunity ||
      "",

    analysis: null,
    analyzedAt: null
  };

  state.leads.push(newLead);

  saveLeads();

  renderDiscoveryResults();
  render();

  setDiscoveryStatus(
    `${newLead.name} added to your leads.`,
    "success"
  );
}

/* =========================
   ADD ALL DISCOVERED
========================= */

function addAllDiscovered() {
  let added = 0;

  state.discovery.forEach((lead, index) => {

    const duplicate = state.leads.some((existing) => {

      const sameWebsite =
        lead.website &&
        existing.web &&
        lead.website !== "—" &&
        existing.web !== "—" &&
        lead.website.replace(/\/$/, "") ===
          existing.web.replace(/\/$/, "");

      const sameName =
        lead.name &&
        existing.name &&
        lead.name.toLowerCase() ===
          existing.name.toLowerCase();

      return sameWebsite || sameName;
    });

    if (duplicate) return;

    state.leads.push({
      id:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${index}`,

      name:
        lead.name ||
        "Unknown Business",

      location:
        lead.location ||
        "",

      web:
        lead.website ||
        "",

      score:
        Number(lead.score || 0),

      status:
        lead.status ||
        statusLabel(Number(lead.score || 0)),

      value:
        Number(lead.value || 250),

      source:
        lead.source ||
        "OpenStreetMap",

      phone:
        lead.phone ||
        "",

      opportunity:
        lead.opportunity ||
        "",

      analysis: null,
      analyzedAt: null
    });

    added++;
  });

  saveLeads();

  renderDiscoveryResults();
  render();

  setDiscoveryStatus(
    `${added} new lead${added === 1 ? "" : "s"} added to your pipeline.`,
    "success"
  );
}

/* =========================
   DISCOVER LEADS
========================= */

async function discoverLeads() {

  const elements = getDiscoveryElements();

  const niche = elements.niche;
  const location = elements.location;
  const limit = elements.limit;

  if (!niche || !location) {
    console.error(
      "Discovery inputs not found in index.html"
    );

    return;
  }

  const nicheValue =
    niche.value.trim();

  const locationValue =
    location.value.trim();

  const limitValue =
    Number(limit?.value || 5);

  if (!nicheValue || !locationValue) {

    setDiscoveryStatus(
      "Enter a business niche and location first.",
      "error"
    );

    return;
  }

  setDiscoveryStatus(
    "Searching legitimate public business data...",
    "loading"
  );

  const buttons = [
    $("discoverBtn"),
    $("discoverBtn2"),
    $("searchProspects")
  ].filter(Boolean);

  buttons.forEach((button) => {
    button.disabled = true;

    button.dataset.originalText =
      button.textContent;

    button.textContent =
      "Searching...";
  });

  try {

    const response = await fetch(
      "./api/discover",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          niche: nicheValue,

          location:
            locationValue,

          limit:
            Math.min(
              Math.max(
                limitValue,
                1
              ),
              15
            )
        })
      }
    );

    const raw =
      await response.text();

    let data;

    try {

      data =
        JSON.parse(raw);

    } catch {

      throw new Error(
        "The discovery server returned an invalid response."
      );
    }

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
        "Lead discovery failed."
      );
    }

    state.discovery =
      Array.isArray(data.leads)
        ? data.leads
        : [];

    saveDiscovery();

    renderDiscoveryResults();

    setDiscoveryStatus(
      `${state.discovery.length} prospects found.`,
      "success"
    );

  } catch (error) {

    console.error(
      "Discovery error:",
      error
    );

    setDiscoveryStatus(
      error.message ||
      "Unable to find leads.",
      "error"
    );

  } finally {

    buttons.forEach((button) => {

      button.disabled = false;

      button.textContent =
        button.dataset.originalText ||
        "Find New Leads";
    });
  }
}

/* =========================
   IMPORTANT:
   DISCOVERY BUTTON EVENT
========================= */

document.addEventListener(
  "click",
  (event) => {

    const button =
      event.target.closest(
        "#discoverBtn, #discoverBtn2, #searchProspects"
      );

    if (!button) return;

    event.preventDefault();
    event.stopPropagation();

    discoverLeads();
  }
);

/* =========================
   WEBSITE ANALYSIS
========================= */

async function analyzeLead(id) {

  const lead =
    state.leads.find(
      (item) => item.id === id
    );

  if (!lead) return;

  if (!$("analysisModal")) {

    alert(
      "Analysis panel is not available."
    );

    return;
  }

  $("analysisModal")
    .classList
    .add("show");

  if ($("analysisTitle")) {

    $("analysisTitle").textContent =
      lead.name ||
      "Website Analysis";
  }

  if ($("analysisContent")) {

    $("analysisContent").innerHTML = `
      <div class="analysis-loading">

        <div class="analysis-spinner"></div>

        <strong>
          Analyzing website...
        </strong>

        <span>
          Checking website structure and conversion signals.
        </span>

      </div>
    `;
  }

  if (
    !lead.web ||
    lead.web === "—"
  ) {

    const fallback = {

      score:
        Math.max(
          Number(lead.score || 0),
          55
        ),

      status: "Warm",

      value: 500,

      https: false,

      reachable: false,

      mobile: false,

      title: "",

      opportunity:
        "No website was detected. This is a direct website-development opportunity.",

      reasons: [
        "No website was detected.",
        "A new professional website could create a stronger online presence.",
        "A clear contact or booking flow can be added from the start."
      ]
    };

    lead.analysis =
      fallback;

    lead.score =
      fallback.score;

    lead.status =
      fallback.status;

    lead.value =
      fallback.value;

    saveLeads();

    showAnalysis(
      fallback
    );

    render();

    return;
  }

  try {

    const response =
      await fetch(
        "./api/analyze",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            id:
              lead.id,

            name:
              lead.name,

            website:
              lead.web
          })
        }
      );

    const raw =
      await response.text();

    let data;

    try {

      data =
        JSON.parse(raw);

    } catch {

      throw new Error(
        "The analysis server returned an invalid response."
      );
    }

    if (
      !response.ok ||
      !data.success
    ) {

      throw new Error(
        data.error ||
        "Website analysis failed."
      );
    }

    const analysis =
      data.analysis;

    lead.analysis =
      analysis;

    lead.analyzedAt =
      new Date().toISOString();

    lead.score =
      Number(
        analysis.score ||
        lead.score ||
        0
      );

    lead.status =
      analysis.status ||
      statusLabel(
        lead.score
      );

    lead.value =
      Number(
        analysis.value ||
        lead.value ||
        250
      );

    saveLeads();

    showAnalysis(
      analysis
    );

    render();

  } catch (error) {

    console.error(
      error
    );

    if ($("analysisContent")) {

      $("analysisContent").innerHTML = `
        <div class="analysis-error">

          <strong>
            Analysis failed
          </strong>

          <span>
            ${esc(error.message)}
          </span>

          <button
            type="button"
            onclick="analyzeLead('${esc(id)}')"
          >
            Try again
          </button>

        </div>
      `;
    }
  }
}

window.analyzeLead =
  analyzeLead;

/* =========================
   SHOW ANALYSIS
========================= */

function showAnalysis(
  analysis
) {

  if (!$("analysisContent"))
    return;

  const score =
    Number(
      analysis.score || 0
    );

  const cls =
    scoreClass(score);

  const reasons =
    Array.isArray(
      analysis.reasons
    )
      ? analysis.reasons
      : [];

  $("analysisContent").innerHTML = `

    <div class="analysis-summary">

      <div
        class="analysis-score ${cls}"
      >

        <strong>
          ${score}
        </strong>

        <span>
          /100
        </span>

        <b>
          ${esc(
            analysis.status ||
            statusLabel(score)
          )}
        </b>

      </div>

      <div class="analysis-value">

        <small>
          Recommended project
        </small>

        <strong>
          ${formatValue(
            analysis.value ||
            250
          )}
        </strong>

      </div>

    </div>

    <div class="analysis-checks">

      <div>
        <span>HTTPS</span>
        <strong>
          ${
            analysis.https
              ? "✓ Yes"
              : "✕ No"
          }
        </strong>
      </div>

      <div>
        <span>
          Website reachable
        </span>

        <strong>
          ${
            analysis.reachable
              ? "✓ Yes"
              : "✕ No"
          }
        </strong>
      </div>

      <div>
        <span>
          Mobile viewport
        </span>

        <strong>
          ${
            analysis.mobile
              ? "✓ Detected"
              : "✕ Missing"
          }
        </strong>
      </div>

      <div>
        <span>
          Page title
        </span>

        <strong>
          ${
            analysis.title
              ? "✓ Detected"
              : "✕ Missing"
          }
        </strong>
      </div>

    </div>

    <div class="analysis-section">

      <small>
        OPPORTUNITY
      </small>

      <p>
        ${esc(
          analysis.opportunity ||
          "Look for specific business and conversion improvements before outreach."
        )}
      </p>

    </div>

    ${
      reasons.length
        ? `
          <div class="analysis-section">

            <small>
              REASONS
            </small>

            <ul>

              ${reasons.map(
                (reason) => `
                  <li>
                    ${esc(reason)}
                  </li>
                `
              ).join("")}

            </ul>

          </div>
        `
        : ""
    }
  `;
}

/* =========================
   CLOSE ANALYSIS
========================= */

if ($("closeAnalysis")) {

  $("closeAnalysis").onclick =
    () => {

      if ($("analysisModal")) {

        $("analysisModal")
          .classList
          .remove("show");
      }
    };
}

/* =========================
   MAIN RENDER
========================= */

function render() {

  const leads =
    state.leads;

  if ($("total")) {

    $("total").textContent =
      leads.length;
  }

  if ($("hot")) {

    $("hot").textContent =
      leads.filter(
        (lead) =>
          Number(
            lead.score || 0
          ) >= 75
      ).length;
  }

  if ($("msgs")) {

    $("msgs").textContent =
      leads.length;
  }

  if ($("value")) {

    const totalValue =
      leads.reduce(
        (sum, lead) =>
          sum +
          Number(
            lead.value || 0
          ),
        0
      );

    $("value").textContent =
      "$" +
      totalValue.toLocaleString();
  }

  if ($("rows")) {

    $("rows").innerHTML =
      leads.length
        ? leads.map(
            (lead) => {

              const score =
                Number(
                  lead.score || 0
                );

              const cls =
                scoreClass(
                  score
                );

              return `
                <tr>

                  <td>
                    <b>
                      ${esc(
                        lead.name
                      )}
                    </b>
                  </td>

                  <td>
                    <span
                      class="lead-location-cell"
                    >
                      ${esc(
                        lead.location ||
                        "—"
                      )}
                    </span>
                  </td>

                  <td>

                    ${
                      lead.web
                        ? `
                          <a
                            href="${esc(
                              lead.web
                            )}"
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
                    <strong>
                      ${score}/100
                    </strong>
                  </td>

                  <td>

                    <span
                      class="table-status ${cls}"
                    >
                      ${esc(
                        lead.status ||
                        statusLabel(score)
                      )}
                    </span>

                  </td>

                  <td>
                    $${Number(
                      lead.value || 0
                    ).toLocaleString()}
                  </td>

                  <td>

                    <button
                      type="button"
                      class="table-analyze-btn"
                      onclick="analyzeLead('${esc(
                        lead.id
                      )}')"
                    >
                      ${
                        lead.analysis
                          ? "Re-analyze"
                          : "Analyze"
                      }
                    </button>

                  </td>

                </tr>
              `;
            }
          ).join("")
        : `
          <tr>

            <td
              colspan="7"
              class="empty"
            >
              No leads yet.
              Discover your first prospects.
            </td>

          </tr>
        `;
  }

  if ($("out")) {

    const qualified =
      leads.filter(
        (lead) =>
          Number(
            lead.score || 0
          ) >= 55
      );

    $("out").innerHTML =
      qualified.length
        ? qualified.map(
            (lead) => `
              <div
                class="card outreachcard"
              >

                <b>
                  ${esc(
                    lead.name
                  )}
                </b>

                <p>
                  Hi ${esc(
                    lead.name
                  )}, I came across your business and noticed an opportunity to improve the website experience. I build modern websites and web apps for businesses. If you're open to it, I can send a few specific ideas.
                </p>

              </div>
            `
          ).join("")
        : `
          <div
            class="card empty"
          >
            Analyze and qualify leads
            to prepare outreach drafts.
          </div>
        `;
  }

  renderDiscoveryResults();
}

/* =========================
   SETTINGS
========================= */

function loadSettings() {

  if ($("settingMinimum")) {
    $("settingMinimum").value =
      state.settings.minimum;
  }

  if ($("settingStandard")) {
    $("settingStandard").value =
      state.settings.standard;
  }

  if ($("settingCustom")) {
    $("settingCustom").value =
      state.settings.custom;
  }

  if ($("settingDaily")) {
    $("settingDaily").value =
      state.settings.daily;
  }
}

if ($("save")) {

  $("save").onclick =
    () => {

      state.settings = {

        minimum:
          Number(
            $("settingMinimum")?.value ||
            250
          ),

        standard:
          Number(
            $("settingStandard")?.value ||
            500
          ),

        custom:
          Number(
            $("settingCustom")?.value ||
            1000
          ),

        daily:
          Number(
            $("settingDaily")?.value ||
            20
          )
      };

      saveSettings();

      alert(
        "Settings saved locally."
      );
    };
}

/* =========================
   PWA INSTALL
========================= */

let deferredPrompt =
  null;

window.addEventListener(
  "beforeinstallprompt",
  (event) => {

    event.preventDefault();

    deferredPrompt =
      event;

    if ($("install")) {
      $("install")
        .classList
        .remove("hidden");
    }
  }
);

if ($("install")) {

  $("install").onclick =
    async () => {

      if (!deferredPrompt)
        return;

      deferredPrompt.prompt();

      await deferredPrompt.userChoice;

      deferredPrompt =
        null;

      $("install")
        .classList
        .add("hidden");
    };
}

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
      console.error
    );
}

/* =========================
   INITIAL LOAD
========================= */

loadSettings();
render();
