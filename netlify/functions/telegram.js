
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
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "HTML",
            disable_web_page_preview: false
          })
        }
      );
    };

    if (address === "/start" || address === "/help") {
      await reply(
        "🚀 <b>WELCOME TO MAESTRO+</b>\n\n" +
        "Send a Solana token contract address " +
        "to receive live market information."
      );
      return new Response("OK");
    }

    if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
      await reply("⚠️ Send a valid Solana contract address.");
      return new Response("OK");
    }

    const response = await fetch(
      `https://api.dexscreener.com/token-pairs/v1/solana/${address}`
    );

    if (!response.ok) {
      await reply("⚠️ Unable to retrieve coin information. Try again.");
      return new Response("OK");
    }

    const pairs = await response.json();

    if (!Array.isArray(pairs) || pairs.length === 0) {
      await reply("❌ Coin not found on DexScreener.");
      return new Response("OK");
    }

    const coin = pairs.reduce((best, current) =>
      (current.liquidity?.usd || 0) >
      (best.liquidity?.usd || 0) ? current : best
    );

    const escapeHTML = (value) =>
      String(value).replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      })[char]);

    const money = (value) =>
      value == null
        ? "N/A"
        : "$" + Number(value).toLocaleString("en-US", {
            maximumFractionDigits: 2
          });

    const name = escapeHTML(coin.baseToken?.name || "Unknown");
    const symbol = escapeHTML(coin.baseToken?.symbol || "Unknown");

    const price = coin.priceUsd
      ? "$" + Number(coin.priceUsd).toLocaleString("en-US", {
          maximumFractionDigits: 12
        })
      : "N/A";

    const volume = coin.volume?.h24;
    const change = coin.priceChange?.h24;
    const buys = coin.txns?.h24?.buys ?? "N/A";
    const sells = coin.txns?.h24?.sells ?? "N/A";
    const dex = escapeHTML(coin.dexId || "Unknown");

    const chartUrl =
      `https://dexscreener.com/solana/${encodeURIComponent(
        coin.pairAddress || address
      )}`;

    await reply(
      `🔎 <b>MAESTRO+ COIN SCANNER</b>\n\n` +
      `🪙 <b>Name:</b> ${name}\n` +
      `💎 <b>Symbol:</b> ${symbol}\n` +
      `💵 <b>Price:</b> ${price}\n` +
      `📊 <b>Market Cap:</b> ${money(coin.marketCap)}\n` +
      `💧 <b>Liquidity:</b> ${money(coin.liquidity?.usd)}\n` +
      `📈 <b>24H Volume:</b> ${money(volume)}\n` +
      `📉 <b>24H Change:</b> ${change == null ? "N/A" : change + "%"}\n\n` +
      `🟢 <b>24H Buys:</b> ${buys}\n` +
      `🔴 <b>24H Sells:</b> ${sells}\n\n` +
      `🌐 <b>Network:</b> Solana\n` +
      `🏦 <b>DEX:</b> ${dex}\n` +
      `📄 <b>Contract:</b> <code>${address}</code>\n\n` +
      `📊 <a href="${chartUrl}">VIEW DEXSCREENER CHART</a>`
    );

    return new Response("OK");

  } catch (error) {
    return new Response("Internal error", {
      status: 500
    });
  }
};
