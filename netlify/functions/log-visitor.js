// netlify/functions/log-visitor.js

exports.handler = async function (event, context) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    const headers = {
        "Access-Control-Allow-Origin": "*", // Allows all your different domains to connect
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Content-Type": "application/json"
    };

    if (event.httpMethod === "OPTIONS") {
        return { 
            statusCode: 200, 
            headers,
            body: "" 
        };
    }

    try {
        let requestBody = {};
        if (event.body) {
            requestBody = JSON.parse(event.body);
        }

        // Capture Netlify Edge network details
        const visitorIp = event.headers['x-nf-client-connection-ip'] ||
            event.headers['client-ip'] ||
            event.headers['x-forwarded-for'] ||
            'Unknown IP';

        const countryCode = event.headers['x-country'] || 'Unknown Country';

        // 🚀 Extract the site name and OS sent by the front-end
        const siteName = requestBody.siteName || 'Generic Static Site';
        const OSNAME = requestBody.OSNAME || 'Unknown OS';

        let messageToSend = "";

        // SCENARIO A: FRONT-END SENT A CUSTOM MESSAGE (like a form or click alert)
        if (requestBody.message) {
            messageToSend = `
💻 *Alert from:* ${siteName}
💬 *Message:* ${requestBody.message}
🖥️ *OS:* ${OSNAME}
🌐 *Visitor IP:* ${visitorIp}
      `.trim();
        }
        // SCENARIO B: DEFAULT PAGE LOAD (IP & COUNTRY ONLY)
        else {
            messageToSend = `
🔔 *New Visitor*
🏢 *Site:* ${siteName}
🖥️ *OS:* ${OSNAME}
🌐 *IP:* ${visitorIp}
📍 *Country:* ${countryCode}
      `.trim();
        }

        // Send to Telegram
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
