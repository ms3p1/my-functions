// netlify/functions/log-visitor.js

exports.handler = async function (event, context) {
    // 1. Grab the visitor's IP address from Netlify's headers
    const visitorIp = event.headers['x-nf-client-connection-ip'] || 'Unknown IP';

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    // Set up common CORS headers so your cPanel site can read the response
    const headers = {
        "Access-Control-Allow-Origin": "*", // Allows your cPanel domain to connect
        "Access-Control-Allow-Headers": "Content-Type",
        "Content-Type": "application/json"
    };

    try {
        // 2. Fetch Geolocation details using the visitor's IP
        const geoResponse = await fetch(`https://ipapi.co/${visitorIp}/json/`);
        const geoData = await geoResponse.json();

        // 3. Format and send the message to Telegram (only if credentials exist)
        if (botToken && chatId) {
            const message = `
🔔 *New Secure Visitor Alert*
🌐 *IP:* ${visitorIp}
📍 *Location:* ${geoData.city || 'Unknown'}, ${geoData.region || 'Unknown'}, ${geoData.country_name || 'Unknown'}
🏢 *ISP:* ${geoData.org || 'Unknown'}
      `.trim();

            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'Markdown'
                })
            });
        }

        // 4. RETURN the IP and location data back to your frontend JavaScript
        return {
            statusCode: 200,
            headers: headers,
            body: JSON.stringify({
                ip: visitorIp,
                city: geoData.city || 'Unknown',
                region: geoData.region || 'Unknown',
                country: geoData.country_name || 'Unknown'
            }),
        };

    } catch (error) {
        console.error("Error processing visitor log:", error);
        return {
            statusCode: 500,
            headers: headers,
            body: JSON.stringify({ error: "Failed to process request" }),
        };
    }
};