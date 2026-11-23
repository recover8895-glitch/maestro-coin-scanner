
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Maestro+ is online");
  }

  const TOKEN = Netlify.env.get("TELEGRAM_BOT_TOKEN");

  if (!TOKEN) {
    return new Response("Bot token not configured", {
      status: 500
    });
  }

  try {
    const update = await req.json();
    const message = update.message;
    const chatId = message?.chat?.id;
    const address = message?.text?.trim();

    if (!chatId || !address) {
      return new Response("OK");
    }

    const reply = async (text) => {
      await fetch(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML"
          })
        }
      );
    };

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      await reply("Send a valid Solana contract address.");
      return new Response("OK");
    }

    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${address}`
    );

    const pairs = await response.json();

    if (!Array.isArray(pairs) || pairs.length === 0) {
      await reply("Coin not found on DexScreener.");
      return new Response("OK");
    }

    const coin = pairs[0];
    const name = coin.baseToken?.name || "Unknown";
    const symbol = coin.baseToken?.symbol || "Unknown";

    await reply(
      `🔎 <b>MAESTRO+ COIN SCANNER</b>\n\n` +
      `🪙 Name: ${name}\n` +
      `💎 Symbol: ${symbol}\n` +
      `💵 Price: $${coin.priceUsd || "N/A"}\n` +
      `📊 Market Cap: $${coin.marketCap ?? "N/A"}\n` +
      `💧 Liquidity: $${coin.liquidity?.usd ?? "N/A"}\n\n` +
      `📍 Network: Solana\n` +
      `📄 Contract: <code>${address}</code>`
    );

    return new Response("OK");
  } catch (error) {
    return new Response("Error", {status: 500});
  }
};
