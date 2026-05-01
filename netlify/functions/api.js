const fetch = require("node-fetch");

const ESPN = "https://site.api.espn.com/apis/site/v2/sports/football/nfl";

exports.handler = async function(event) {
  const path = event.path.replace(/^\/?api\//, "");

  let url;

  if (path === "scores") {
    url = `${ESPN}/scoreboard`;
  } else if (path === "standings") {
    url = `${ESPN}/standings`;
  } else if (path.match(/^roster\/[a-z]+$/i)) {
    const abbr = path.split("/")[1].toLowerCase();
    url = `${ESPN}/teams/${abbr}/roster`;
  } else if (path.match(/^player\/\d+\/stats$/)) {
    const id = path.split("/")[1];
    url = `${ESPN}/athletes/${id}/statistics`;
  } else if (path.match(/^player\/\d+$/)) {
    const id = path.split("/")[1];
    url = `${ESPN}/athletes/${id}`;
  } else {
    return { statusCode: 404, body: JSON.stringify({ error: "Unknown route" }) };
  }

  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      }
    });

    const data = await res.json();

    return {
      statusCode: res.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
