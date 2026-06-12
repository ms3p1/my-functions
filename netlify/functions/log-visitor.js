// netlify/functions/log-visitor.js

exports.handler = async function (event, context) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const ipinfoToken = process.env.IPINFO_TOKEN; // Your new token

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
    // ─── SCENARIO B: DEFAULT PAGE LOAD (FULL SECURE TRACKING) ───
    else {
      if (visitorIp === '127.0.0.1' || visitorIp === '::1' || visitorIp === 'Unknown IP') {
        messageToSend = `🔔 *Visitor Alert*\n🌐 *IP:* ${visitorIp}\n📍 Localhost testing detected.`;
      } else if (!ipinfoToken) {
        messageToSend = `⚠️ *Configuration Error*\nMissing IPINFO_TOKEN in Netlify settings.`;
      } else {
        try {
          // Fetch comprehensive data using your dedicated account token
          const geoResponse = await fetch(`https://ipinfo.io/${visitorIp}/json?token=${ipinfoToken}`);
          geoData = await geoResponse.json();

          // Ipinfo combines ISP and Organization into the "org" field (e.g., "AS15169 Google LLC")
          const city = geoData.city || 'Unknown City';
          const region = geoData.region || 'Unknown Region';
          const country = geoData.country || 'Unknown Country';
          const ispOrg = geoData.org || 'Unknown ISP/Org';
          const postal = geoData.postal || 'Unknown Zip';

          messageToSend = `
🔔 *New Secure Visitor Alert*
🌐 *IP:* ${visitorIp}
📍 *Location:* ${city}, ${region}, ${country} (${postal})
🏢 *ISP/Org:* ${ispOrg}
          `.trim();

        } catch (apiErr) {
          messageToSend = `🔔 *Visitor Alert*\n🌐 *IP:* ${visitorIp}\n⚠️ Ipinfo API timed out or offline.`;
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

    // Return the clean data to your cPanel front-end script
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: "Success",
        ip: visitorIp,
        city: geoData.city || "Unknown",
        region: geoData.region || "Unknown",
        country: geoData.country || "Unknown",
        isp: geoData.org || "Unknown"
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
