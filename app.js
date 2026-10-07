const state = {
  leads: JSON.parse(localStorage.getItem("ach_leads") || "[]"),
  settings: JSON.parse(localStorage.getItem("ach_settings") || "{}")
};

const $ = id => document.getElementById(id);

function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));
}

/* =========================
   NAVIGATION
========================= */

document.querySelectorAll("nav button").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("nav button").forEach(x =>
      x.classList.remove("active")
    );

    document.querySelectorAll(".page").forEach(x =>
      x.classList.remove("active")
    );

    btn.classList.add("active");

    const page = $(btn.dataset.page);
    if (page) page.classList.add("active");

    const title = $("title");
    if (title) title.textContent = btn.textContent.trim();
  });
});

/* =========================
   MODAL
========================= */

function openModal() {
  const modal = $("modal");
  if (modal) modal.classList.add("show");
}

function closeModal() {
  const modal = $("modal");
  if (modal) modal.classList.remove("show");
}

if ($("add")) {
  $("add").addEventListener("click", openModal);
}

if ($("close")) {
  $("close").addEventListener("click", closeModal);
}

document.querySelectorAll(".add").forEach(btn => {
  btn.addEventListener("click", openModal);
});

/* =========================
   ADD LEAD
========================= */

if ($("form")) {
  $("form").addEventListener("submit", e => {
    e.preventDefault();

    const name = $("business")?.value.trim();
    const web = $("website")?.value.trim() || "—";
    const score = Number($("score")?.value || 0);
    const value = Number($("potential")?.value || 0);

    if (!name) return;

    state.leads.push({
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
      name,
      web,
      score,
      value,
      status: score >= 75 ? "Hot" : score >= 55 ? "Warm" : "Cold",
      source: "Manual"
    });

    saveLeads();

    closeModal();

    e.target.reset();

    if ($("potential")) {
      $("potential").value = 500;
    }

    render();
  });
}

/* =========================
   SAVE
========================= */

function saveLeads() {
  localStorage.setItem("ach_leads", JSON.stringify(state.leads));
}

if ($("save")) {
  $("save").addEventListener("click", () => {
    const inputs = document.querySelectorAll(".settings input");

    state.settings = {
      minimum: inputs[0]?.value || 250,
      standard: inputs[1]?.value || 500,
      custom: inputs[2]?.value || 1000,
      daily: inputs[3]?.value || 20
    };

    localStorage.setItem(
      "ach_settings",
      JSON.stringify(state.settings)
    );

    alert("Settings saved.");
  });
}

/* =========================
   DISCOVERY BUTTON
   Creates itself so old HTML
   also keeps working.
========================= */

function createDiscoveryUI() {

  if ($("discoverBtn")) return;

  const dashboard = $("dashboard");

  if (!dashboard) return;

  const box = document.createElement("div");

  box.className = "card";
  box.style.marginTop = "20px";

  box.innerHTML = `
    <div class="cardhead">
      <div>
        <h3>Lead Discovery</h3>
        <small>FREE PUBLIC BUSINESS DATA</small>
      </div>
      <button id="discoverBtn">Find New Leads</button>
    </div>

    <p class="muted">
      Search legitimate public business listings and add suitable prospects
      to your pipeline.
    </p>

    <div id="discoveryForm" style="display:none;margin-top:18px">

      <input
        id="discoveryNiche"
        placeholder="Business type e.g. dentist"
        style="width:100%;padding:11px;margin-bottom:10px;background:#080b10;color:#fff;border:1px solid #28313d;border-radius:8px"
      >

      <input
        id="discoveryLocation"
        placeholder="Location e.g. Los Angeles, USA"
        style="width:100%;padding:11px;margin-bottom:10px;background:#080b10;color:#fff;border:1px solid #28313d;border-radius:8px"
      >

      <select
        id="discoveryLimit"
        style="width:100%;padding:11px;margin-bottom:10px;background:#080b10;color:#fff;border:1px solid #28313d;border-radius:8px"
      >
        <option value="5">5 prospects</option>
        <option value="10">10 prospects</option>
        <option value="15">15 prospects</option>
      </select>

      <button id="runDiscovery">
        Search Prospects
      </button>

      <div id="discoveryStatus" style="margin-top:12px"></div>

      <div id="discoveryResults" style="margin-top:15px"></div>

    </div>
  `;

  dashboard.appendChild(box);

  $("discoverBtn").addEventListener("click", () => {
    const form = $("discoveryForm");

    form.style.display =
      form.style.display === "none" ? "block" : "none";
  });

  $("runDiscovery").addEventListener("click", discoverLeads);
}

/* =========================
   DISCOVER LEADS
========================= */

async function discoverLeads() {

  const niche = $("discoveryNiche")?.value.trim();
  const location = $("discoveryLocation")?.value.trim();
  const limit = Number($("discoveryLimit")?.value || 5);

  const status = $("discoveryStatus");
  const results = $("discoveryResults");

  if (!niche || !location) {
    if (status) {
      status.innerHTML =
        `<div class="warning">Enter business type and location.</div>`;
    }
    return;
  }

  if (status) {
    status.innerHTML = "Searching public business listings...";
  }

  if (results) {
    results.innerHTML = "";
  }

  try {

    const response = await fetch("./api/discover", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        niche,
        location,
        limit
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Discovery failed.");
    }

    const leads = data.leads || [];

    if (!leads.length) {

      if (status) {
        status.innerHTML =
          `<div class="warning">
            No suitable prospects found. Try another niche or location.
          </div>`;
      }

      return;
    }

    if (status) {
      status.innerHTML =
        `<div class="success">
          Found ${leads.length} prospects.
        </div>`;
    }

    renderDiscoveryResults(leads);

  } catch (error) {

    console.error(error);

    if (status) {
      status.innerHTML =
        `<div class="warning">
          Error: ${esc(error.message)}
        </div>`;
    }
  }
}

/* =========================
   DISCOVERY RESULTS
========================= */

function renderDiscoveryResults(leads) {

  const results = $("discoveryResults");

  if (!results) return;

  results.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <b>New prospects</b>
      <button id="addAllDiscovered">Add All</button>
    </div>

    ${leads.map((lead, index) => `
      <div
        class="card"
        style="margin-bottom:10px;padding:14px"
      >

        <div style="display:flex;justify-content:space-between;gap:10px">

          <div>
            <b>${esc(lead.name)}</b>

            <div class="muted">
              ${esc(lead.location || "")}
            </div>

            ${
              lead.website
                ? `<div style="margin-top:5px">
                    <a href="${esc(lead.website)}"
                       target="_blank"
                       rel="noopener noreferrer">
                      Website
                    </a>
                  </div>`
                : ""
            }

            ${
              lead.phone
                ? `<div class="muted">
                    ${esc(lead.phone)}
                  </div>`
                : ""
            }
          </div>

          <div style="text-align:right">
            <b>${lead.score}/100</b>

            <div class="muted">
              ${esc(lead.status || "")}
            </div>
          </div>

        </div>

        <button
          class="addDiscovered"
          data-index="${index}"
          style="margin-top:10px"
        >
          Add Lead
        </button>

      </div>
    `).join("")}
  `;

  document.querySelectorAll(".addDiscovered").forEach(btn => {

    btn.addEventListener("click", () => {

      const lead = leads[Number(btn.dataset.index)];

      addDiscoveredLead(lead);

      btn.textContent = "Added ✓";
      btn.disabled = true;
    });

  });

  $("addAllDiscovered")?.addEventListener("click", () => {

    let added = 0;

    leads.forEach(lead => {

      if (addDiscoveredLead(lead)) {
        added++;
      }

    });

    render();

    if ($("discoveryStatus")) {
      $("discoveryStatus").innerHTML =
        `<div class="success">
          ${added} new leads added.
        </div>`;
    }

  });
}

/* =========================
   ADD DISCOVERED LEAD
========================= */

function addDiscoveredLead(lead) {

  const duplicate = state.leads.some(existing => {

    const sameWebsite =
      lead.website &&
      existing.web &&
      lead.website !== "—" &&
      existing.web !== "—" &&
      lead.website.toLowerCase() === existing.web.toLowerCase();

    const sameName =
      existing.name &&
      lead.name &&
      existing.name.toLowerCase() === lead.name.toLowerCase();

    return sameWebsite || sameName;
  });

  if (duplicate) return false;

  state.leads.push({
    id: lead.id || Date.now().toString(),
    name: lead.name,
    web: lead.website || "—",
    location: lead.location || "",
    phone: lead.phone || "",
    score: Number(lead.score || 0),
    status: lead.status || "Warm",
    value: Number(lead.value || 500),
    source: lead.source || "Public business listing",
    opportunity: lead.opportunity || ""
  });

  saveLeads();
  render();

  return true;
}

/* =========================
   RENDER
========================= */

function render() {

  const leads = state.leads;

  if ($("total")) {
    $("total").textContent = leads.length;
  }

  if ($("hot")) {
    $("hot").textContent =
      leads.filter(x => Number(x.score) >= 75).length;
  }

  if ($("msgs")) {
    $("msgs").textContent = leads.length;
  }

  if ($("value")) {

    const totalValue = leads.reduce(
      (sum, lead) => sum + Number(lead.value || 0),
      0
    );

    $("value").textContent =
      "$" + totalValue.toLocaleString();
  }

  if ($("rows")) {

    $("rows").innerHTML = leads.length

      ? leads.map(lead => `
        <tr>

          <td>
            <b>${esc(lead.name)}</b>
          </td>

          <td>
            ${
              lead.web && lead.web !== "—"
                ? `<a href="${esc(lead.web)}"
                     target="_blank"
                     rel="noopener noreferrer">
                     ${esc(lead.web)}
                   </a>`
                : "—"
            }
          </td>

          <td>
            ${Number(lead.score || 0)}/100
          </td>

          <td>
            ${esc(
              lead.status ||
              (lead.score >= 75 ? "Hot" : "Warm")
            )}
          </td>

          <td>
            $${Number(lead.value || 0).toLocaleString()}
          </td>

        </tr>
      `).join("")

      : `
        <tr>
          <td colspan="5" class="empty">
            No leads yet. Add your first prospect.
          </td>
        </tr>
      `;
  }

  if ($("out")) {

    $("out").innerHTML = leads.length

      ? leads.map(lead => `
        <div class="card outreachcard">

          <b>${esc(lead.name)}</b>

          <p>
            Hi ${esc(lead.name)}, I came across your business and noticed
            an opportunity to improve the website experience. I build
            modern websites and web apps for businesses. If you're open
            to it, I can send a few specific ideas.
          </p>

        </div>
      `).join("")

      : `
        <div class="card empty">
          No outreach drafts yet.
        </div>
      `;
  }
}

/* =========================
   PWA INSTALL
========================= */

let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", event => {

  event.preventDefault();

  deferredPrompt = event;

  if ($("install")) {
    $("install").classList.remove("hidden");
  }
});

if ($("install")) {

  $("install").addEventListener("click", async () => {

    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    await deferredPrompt.userChoice;

    deferredPrompt = null;

    $("install").classList.add("hidden");
  });
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
    .catch(error => console.error("SW:", error));
}

/* =========================
   START APP
========================= */

createDiscoveryUI();
render();
