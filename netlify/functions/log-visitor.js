// netlify/functions/log-visitor.js

exports.handler = async function (event, context) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  const headers = {
    "Access-Control-Allow-Origin": "*", // Allows your cPanel site to connect safely
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  // Handle browser CORS preflight requests safely
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers };
  }

  try {
    let requestBody = {};
    if (event.body) {
      requestBody = JSON.parse(event.body);
    }

    // 🚀 Read IP and Country directly from Netlify's Edge router headers
    const visitorIp = event.headers['x-nf-client-connection-ip'] || 
                      event.headers['client-ip'] || 
                      event.headers['x-forwarded-for'] || 
                      'Unknown IP';
                      
    const countryCode = event.headers['x-country'] || 'Unknown Country';

    let messageToSend = "";

    // SCENARIO A: FRONT-END SENT A CUSTOM MESSAGE
    if (requestBody.message) {
      messageToSend = requestBody.message;
    } 
    // SCENARIO B: DEFAULT PAGE LOAD (IP & COUNTRY ONLY)
    else {
      messageToSend = `
🔔 *New Visitor Alert*
🌐 *IP:* ${visitorIp}
📍 *Country:* ${countryCode}
      `.trim();
    }

    // Forward the compiled string to Telegram
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

    // Return the clean data to your cPanel frontend script
    return {
      statusCode: 200,
      headers: headers,
      body: JSON.stringify({
        status: "Success",
        ip: visitorIp,
        country: countryCode
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
