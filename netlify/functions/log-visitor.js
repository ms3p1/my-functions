// netlify/functions/log-visitor.js

exports.handler = async function (event, context) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    let requestBody = {};
    if (event.body) {
      requestBody = JSON.parse(event.body);
    }

    // Capture the visitor's real IP address
    const visitorIp = event.headers['x-nf-client-connection-ip'] || 
                      event.headers['client-ip'] || 
                      event.headers['x-forwarded-for'] || 
                      'Unknown IP';

    let messageToSend = "";
    let geoData = {};

    // ─── SCENARIO A: FRONT-END SENT A CUSTOM MESSAGE ───
    if (requestBody.message) {
      messageToSend = requestBody.message;
    } 
    // ─── SCENARIO B: DEFAULT PAGE LOAD (FULL DETAILS TRACKING) ───
    else {
      if (visitorIp === '127.0.0.1' || visitorIp === '::1' || visitorIp === 'Unknown IP') {
        messageToSend = `🔔 *Visitor Alert*\n🌐 *IP:* ${visitorIp}\n📍 Localhost testing detected.`;
      } else {
        try {
          // Fetch comprehensive data from ipwho.is
          const geoResponse = await fetch(`https://ipwho.is/${visitorIp}`);
          geoData = await geoResponse.json();

          if (geoData.success) {
            const city = geoData.city || 'Unknown City';
            const region = geoData.region || 'Unknown Region';
            const country = geoData.country || 'Unknown Country';
            const isp = geoData.connection?.isp || geoData.isp || 'Unknown ISP';
            const org = geoData.connection?.org || geoData.org || 'Unknown Org';

            messageToSend = `
🔔 *New Secure Visitor Alert*
🌐 *IP:* ${visitorIp}
📍 *Location:* ${city}, ${region}, ${country}
🏢 *ISP:* ${isp}
🏢 *Org:* ${org}
            `.trim();
          } else {
            messageToSend = `🔔 *Visitor Alert*\n🌐 *IP:* ${visitorIp}\n⚠️ Geolocation lookup failed.`;
          }
        } catch (apiErr) {
          messageToSend = `🔔 *Visitor Alert*\n🌐 *IP:* ${visitorIp}\n⚠️ Geolocation API offline.`;
        }
      }
    }

    // Send data to Telegram
    if (botToken && chatId && messageToSend) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageToSend,
          parse_mode: 'Markdown'
        })
      });
    }

    // Return ALL requested data cleanly back to your frontend script
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: "Success",
        ip: visitorIp,
        city: geoData.city || "Unknown",
        region: geoData.region || "Unknown",
        country: geoData.country || "Unknown",
        isp: geoData.connection?.isp || "Unknown",
        org: geoData.connection?.org || "Unknown"
      }),
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: "Failed to process request" }),
    };
  }
};// netlify/functions/log-visitor.js

exports.handler = async function (event, context) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    let requestBody = {};
    if (event.body) {
      requestBody = JSON.parse(event.body);
    }

    // Capture the real IP address
    const visitorIp = event.headers['x-nf-client-connection-ip'] || 
                      event.headers['client-ip'] || 
                      event.headers['x-forwarded-for'] || 
                      'Unknown IP';

    // 🚀 NEW: Extract location directly from Netlify's built-in data headers
    const city = event.headers['x-city'] || 'Unknown City';
    const region = event.headers['x-region'] || 'Unknown Region';
    const country = event.headers['x-country'] || 'Unknown Country';

    let messageToSend = "";

    // SCENARIO A: FRONT-END SENT A CUSTOM MESSAGE
    if (requestBody.message) {
      messageToSend = requestBody.message;
    } 
    // SCENARIO B: DEFAULT PAGE LOAD (IP TRACKING)
    else {
      messageToSend = `
🔔 *New Secure Visitor Alert*
🌐 *IP:* ${visitorIp}
📍 *Location:* ${city}, ${region}, ${country}
🏢 *Network:* Detected via Netlify Edge
      `.trim();
    }

    // Send to Telegram
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageToSend,
          parse_mode: 'Markdown'
        })
      });
    }

    // Return the data cleanly back to your frontend script
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: "Success",
        ip: visitorIp,
        city: city,
        country: country
      }),
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: headers,
      body: JSON.stringify({ error: "Failed to process request" }),
    };
  }
};
