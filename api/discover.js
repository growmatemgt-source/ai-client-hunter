```javascript
const NOMINATIM =
  "https://nominatim.openstreetmap.org/search";


function cleanUrl(url) {

  if (!url) return "";

  try {

    const parsed =
      new URL(url);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      return "";
    }

    return parsed.href;

  } catch {

    return "";

  }
}


function normalizeWebsite(url) {

  const clean = cleanUrl(url);

  if (!clean) return "";

  return clean.replace(/\/$/, "");

}


function scoreLead(place) {

  let score = 45;

  const tags = place.extratags || {};

  const website =
    tags.website ||
    tags["contact:website"] ||
    "";

  const phone =
    tags.phone ||
    tags["contact:phone"] ||
    "";


  if (website) score += 25;

  if (phone) score += 10;

  if (place.name) score += 5;

  if (
    place.type === "company" ||
    place.type === "shop" ||
    place.type === "office" ||
    place.type === "commercial"
  ) {
    score += 10;
  }


  return Math.min(score, 100);
}


function projectValue(score) {

  if (score >= 85) return 1000;

  if (score >= 70) return 500;

  return 250;
}


function opportunity(score, website) {

  if (!website) {

    return "Strong website opportunity: no public website was found in the source data.";

  }

  if (score >= 85) {

    return "High-fit prospect with public website/contact information.";

  }

  return "Potential website improvement opportunity.";

}


export default async function handler(req, res) {

  if (req.method !== "POST") {

    return res.status(405).json({
      error: "Method not allowed"
    });

  }


  try {

    const body =
      req.body || {};


    const niche =
      String(body.niche || "")
        .trim()
        .slice(0, 80);


    const location =
      String(body.location || "")
        .trim()
        .slice(0, 100);


    let limit =
      Number(body.limit) || 10;


    limit =
      Math.max(
        1,
        Math.min(limit, 15)
      );


    if (!niche || !location) {

      return res.status(400).json({
        error:
          "Niche and location are required."
      });

    }


    /*
      IMPORTANT:

      Nominatim's public service has a strict
      1 request/second policy.

      We intentionally make ONE user-triggered
      request per discovery search.
    */


    const query =
      `${niche} in ${location}`;


    const url =
      new URL(NOMINATIM);


    url.searchParams.set(
      "q",
      query
    );

    url.searchParams.set(
      "format",
      "jsonv2"
    );

    url.searchParams.set(
      "addressdetails",
      "1"
    );

    url.searchParams.set(
      "extratags",
      "1"
    );

    url.searchParams.set(
      "namedetails",
      "1"
    );

    url.searchParams.set(
      "limit",
      String(limit)
    );


    const response =
      await fetch(
        url.toString(),
        {
          headers: {
            "User-Agent":
              "AI-Client-Hunter/1.0 (user-triggered lead discovery)"
          }
        }
      );


    if (!response.ok) {

      return res.status(502).json({
        error:
          "The public lead source is temporarily unavailable."
      });

    }


    const places =
      await response.json();


    const leads = [];


    for (const place of places) {

      const tags =
        place.extratags || {};


      const website =
        normalizeWebsite(
          tags.website ||
          tags["contact:website"] ||
          ""
        );


      const name =
        place.name ||
        place.namedetails?.name ||
        "";


      if (!name) continue;


      const score =
        scoreLead(place);


      const address =
        place.address || {};


      const city =
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        location;


      const country =
        address.country || "";


      const leadLocation =
        [city, country]
          .filter(Boolean)
          .join(", ");


      leads.push({

        name,

        location:
          leadLocation,

        website:
          website || "",

        websiteStatus:
          website
            ? "Website found"
            : "No website in source data",

        score,

        status:
          score >= 75
            ? "Hot"
            : score >= 55
              ? "Warm"
              : "Cold",

        value:
          projectValue(score),

        opportunity:
          opportunity(
            score,
            website
          ),

        phone:
          tags.phone ||
          tags["contact:phone"] ||
          "",

        source:
          "OpenStreetMap"

      });

    }


    /*
      Remove duplicate business names
      and websites.
    */

    const seen =
      new Set();


    const unique =
      leads.filter(lead => {

        const key =
          (
            lead.website ||
            lead.name
          )
            .toLowerCase()
            .trim();


        if (seen.has(key)) {
          return false;
        }


        seen.add(key);

        return true;

      });


    unique.sort(
      (a, b) =>
        Number(b.score) -
        Number(a.score)
    );


    return res.status(200).json({

      success: true,

      query: {
        niche,
        location,
        limit
      },

      count:
        unique.length,

      leads:
        unique,

      source:
        "OpenStreetMap / Nominatim"

    });


  } catch (error) {

    console.error(
      "Discovery error:",
      error
    );


    return res.status(500).json({

      error:
        "Lead discovery failed. Please try again."

    });

  }

}
```
