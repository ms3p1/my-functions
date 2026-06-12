// netlify/functions/log-visitor.js

exports.handler = async function (event, context) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Handle browser CORS preflight requests
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    // Parse the incoming request body if it exists
    let requestBody = {};
    if (event.body) {
      requestBody = JSON.parse(event.body);
    }

    const visitorIp = event.headers['x-nf-client-connection-ip'] || 'Unknown IP';
    let messageToSend = "";
    let geoData = {};

    // ─── SCENARIO A: FRONT-END SENT A CUSTOM MESSAGE ───
    if (requestBody.message) {
      messageToSend = requestBody.message;
    } 
    // ─── SCENARIO B: DEFAULT PAGE LOAD (IP TRACKING) ───
    else {
      const geoResponse = await fetch(`https://ipapi.co/${visitorIp}/json/`);
      geoData = await geoResponse.json();

      messageToSend = `
🔔 *New Secure Visitor Alert*
🌐 *IP:* ${visitorIp}
📍 *Location:* ${geoData.city || 'Unknown'}, ${geoData.region || 'Unknown'}, ${geoData.country_name || 'Unknown'}
🏢 *ISP:* ${geoData.org || 'Unknown'}
      `.trim();
    }

    // Send whichever message was generated to Telegram
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

    // Always return the IP data back to the front-end just in case you need it
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: "Success",
        ip: visitorIp,
        city: geoData.city || null,
        country: geoData.country_name || null
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
