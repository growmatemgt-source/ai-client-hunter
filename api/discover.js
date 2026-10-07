export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({
        error: "Method not allowed"
      });
    }

    const body = req.body || {};

    const niche = String(body.niche || "").trim();
    const location = String(body.location || "").trim();

    let limit = Number(body.limit || 5);

    if (!niche || !location) {
      return res.status(400).json({
        error: "Niche and location are required."
      });
    }

    if (!Number.isFinite(limit)) {
      limit = 5;
    }

    limit = Math.max(1, Math.min(15, Math.floor(limit)));

    const query = encodeURIComponent(`${niche} in ${location}`);

    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${query}` +
      `&format=jsonv2` +
      `&addressdetails=1` +
      `&extratags=1` +
      `&namedetails=1` +
      `&limit=${limit}`;

    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "AI-Client-Hunter/1.0 (user-triggered lead discovery)"
      }
    });

    if (!response.ok) {
      throw new Error(
        `Nominatim returned HTTP ${response.status}`
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new Error("Invalid discovery response.");
    }

    const leads = data.map((item, index) => {

      const address = item.address || {};
      const tags = item.extratags || {};

      const name =
        item.namedetails?.name ||
        item.name ||
        "Unknown Business";

      const website =
        tags.website ||
        tags["contact:website"] ||
        "";

      const phone =
        tags.phone ||
        tags["contact:phone"] ||
        "";

      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        "";

      const country =
        address.country ||
        "";

      let score = 45;

      if (website) score += 25;
      if (phone) score += 10;
      if (name && name !== "Unknown Business") score += 5;
      if (item.type || item.category) score += 10;

      score = Math.min(score, 100);

      let status = "Cold";

      if (score >= 75) {
        status = "Hot";
      } else if (score >= 55) {
        status = "Warm";
      }

      let value = 250;

      if (score >= 85) {
        value = 1000;
      } else if (score >= 70) {
        value = 500;
      }

      return {
        id: `osm-${item.place_id || index}`,
        name,
        website,
        phone,
        location: [city, country]
          .filter(Boolean)
          .join(", "),
        score,
        status,
        value,
        source: "OpenStreetMap",
        opportunity:
          website
            ? "Existing website found — review quality and conversion opportunities."
            : "No website found — potentially strong website opportunity."
      };
    });

    const unique = [];
    const seen = new Set();

    for (const lead of leads) {

      const key =
        lead.website ||
        lead.name.toLowerCase();

      if (seen.has(key)) continue;

      seen.add(key);
      unique.push(lead);
    }

    unique.sort((a, b) => b.score - a.score);

    return res.status(200).json({
      success: true,
      source: "OpenStreetMap",
      count: unique.length,
      leads: unique
    });

  } catch (error) {

    console.error("DISCOVERY ERROR:", error);

    return res.status(500).json({
      error: error.message || "Lead discovery failed."
    });
  }
}
