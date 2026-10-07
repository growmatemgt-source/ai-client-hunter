export default async function handler(req, res) {

  try {

    if (req.method !== "POST") {

      return res.status(405).json({
        error: "Method not allowed"
      });

    }


    const body =
      req.body || {};

    const website =
      String(
        body.website || ""
      ).trim();


    if (!website) {

      return res.status(400).json({
        error:
          "Website URL is required."
      });

    }


    let url = website;


    if (
      !url.startsWith("http://") &&
      !url.startsWith("https://")
    ) {

      url =
        "https://" + url;

    }


    const parsed =
      new URL(url);


    const response =
      await fetch(
        parsed.href,
        {
          method: "GET",

          headers: {
            "User-Agent":
              "AI-Client-Hunter/1.0"
          },

          redirect: "follow"
        }
      );


    const finalUrl =
      response.url ||
      parsed.href;


    const html =
      await response.text();


    const lower =
      html.toLowerCase();


    const https =
      finalUrl.startsWith(
        "https://"
      );


    const reachable =
      response.ok;


    const titleMatch =
      html.match(
        /<title[^>]*>([\s\S]*?)<\/title>/i
      );


    const title =
      titleMatch
        ? titleMatch[1]
            .replace(/\s+/g, " ")
            .trim()
            .slice(0, 150)
        : "";


    const viewport =
      /<meta[^>]+name=["']viewport["'][^>]*>/i
        .test(html);


    const mobile =
      viewport;


    const hasPhone =
      /tel:|phone|telephone|mobile/i
        .test(html);


    const hasEmail =
      /mailto:|@[\w.-]+\.[a-z]{2,}/i
        .test(html);


    const hasContact =
      /contact|appointment|book now|schedule/i
        .test(html);


    const hasModernSignals =
      /css|javascript|react|next|wordpress|shopify/i
        .test(html);


    let score = 45;

    const reasons = [];


    if (!reachable) {

      score += 20;

      reasons.push(
        "Website is not returning a normal successful response."
      );

    } else {

      reasons.push(
        "Website is reachable."
      );

    }


    if (!https) {

      score += 15;

      reasons.push(
        "HTTPS was not detected on the final URL."
      );

    }


    if (!mobile) {

      score += 15;

      reasons.push(
        "A mobile viewport meta tag was not detected."
      );

    } else {

      reasons.push(
        "Mobile viewport is detected."
      );

    }


    if (!title) {

      score += 10;

      reasons.push(
        "Page title is missing."
      );

    }


    if (!hasContact) {

      score += 8;

      reasons.push(
        "No obvious contact/booking signal was detected."
      );

    }


    if (!hasPhone && !hasEmail) {

      score += 7;

      reasons.push(
        "No obvious phone or email signal was detected."
      );

    }


    if (
      hasModernSignals &&
      mobile &&
      https
    ) {

      score -= 5;

      reasons.push(
        "Some basic modern website signals are present."
      );

    }


    score =
      Math.max(
        0,
        Math.min(
          100,
          score
        )
      );


    let status =
      "Cold";


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


    let opportunity =
      "Website appears reasonably healthy. Look for specific business and conversion improvements before outreach.";


    if (!mobile) {

      opportunity =
        "Mobile experience may need improvement. A responsive redesign could be a strong conversation starter.";

    } else if (!https) {

      opportunity =
        "HTTPS was not detected. Security and trust improvements may be worth discussing.";

    } else if (!title) {

      opportunity =
        "Basic SEO/page structure signals may need improvement.";

    } else if (!hasContact) {

      opportunity =
        "A clearer contact, booking or conversion path may improve the website.";

    } else if (
      !hasPhone &&
      !hasEmail
    ) {

      opportunity =
        "Contact information was not clearly detected. A stronger conversion/contact section may help.";

    }


    return res.status(200).json({

      success: true,

      analysis: {

        score,

        status,

        value,

        https,

        reachable,

        mobile,

        title,

        hasPhone,

        hasEmail,

        hasContact,

        opportunity,

        reasons

      }

    });

  }

  catch (error) {

    console.error(
      "ANALYSIS ERROR:",
      error
    );


    return res.status(500).json({

      error:
        error.message ||
        "Website analysis failed."

    });

  }

}
