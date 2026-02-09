const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");


const bot = new Telegraf(process.env.BOT_TOKEN);


// =========================
// SUBSCRIBERS
// =========================
let subscribers = [];
const lastAlerts = {};
const userFilters = {};
const userAlertMode = {};

const seenAlpha = new Set();


// store last tweets
lastAlerts.binanceX = "";
lastAlerts.mexcX = "";
lastAlerts.bybitX = "";
lastAlerts.okxX = "";
lastAlerts.kucoinX = "";
lastAlerts.gateX = "";
lastAlerts.bitmartX = "";
lastAlerts.lbankX = "";
lastAlerts.xtX = "";
lastAlerts.phemexX = "";
lastAlerts.coinexX = "";
lastAlerts.poloniexX = "";
lastAlerts.ourbitX = "";






// website last alerts
lastAlerts.binance = "";
lastAlerts.mexcSite = "";
lastAlerts.bybit = "";
lastAlerts.okx = "";
lastAlerts.kucoin = "";
lastAlerts.gate = "";
lastAlerts.coinex = "";
lastAlerts.poloniex = "";
lastAlerts.xt = "";
lastAlerts.bitmart = "";
lastAlerts.lbank = "";
lastAlerts.phemex = "";
lastAlerts.ourbit = "";








// =========================
// KEYWORD FILTER
// =========================
const POSITIVE_WORDS = [
  "list",
  "listing",
  "new listing",
  "will list",
  "gets listed",
  "listed on",
  "trading opens",
  "spot trading",
  "futures trading",
  "perpetual"
];


const NEGATIVE_WORDS = [
  "delist",
  "delisting",
  "maintenance",
  "upgrade",
  "suspend",
  "suspension"
];


function isListingPost(text) {
  const t = text.toLowerCase();


  const hasPositive = POSITIVE_WORDS.some(w => t.includes(w));
  const hasNegative = NEGATIVE_WORDS.some(w => t.includes(w));


  return hasPositive && !hasNegative;
}




// =========================
// TIME FUNCTION
// =========================
function getTime() {
  const now = new Date();
  return now.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}


// =========================
// START COMMAND
// =========================
bot.start((ctx) => {
  ctx.reply(
`📡 Welcome to CEXPing Bot
Catch the pump before it starts!


⚠️ This bot does NOT store users.
Restart = Resubscribe`,
    {
      reply_markup: {
        keyboard: [
          ["📈 Track Exchange Listings"],
          ["🧪 Alpha Alerts"],
          ["⚙️ Filter Exchanges"],
          ["📢 Channel (Coming Soon)"]

        ],
        resize_keyboard: true
      }
    }
  );
});


bot.hears("🧪 Alpha Alerts", (ctx) => {
  ctx.reply("Choose alert mode:", {
    reply_markup: {
      keyboard: [
        ["📈 CEX Listings Only"],
        ["🧪 Alpha Only"],
        ["📈🧪 CEX + Alpha"],
        ["⬅ Back"]
      ],
      resize_keyboard: true
    }
  });
});

bot.hears("📈 CEX Listings Only", ctx => {
  userAlertMode[ctx.chat.id] = "CEX";
  ctx.reply("✅ You will receive CEX listings only.");
});

bot.hears("🧪 Alpha Only", ctx => {
  userAlertMode[ctx.chat.id] = "ALPHA";
  ctx.reply("✅ You will receive Alpha alerts only.");
});

bot.hears("📈🧪 CEX + Alpha", ctx => {
  userAlertMode[ctx.chat.id] = "BOTH";
  ctx.reply("✅ You will receive CEX + Alpha alerts.");
});



bot.hears("⚙️ Filter Exchanges", (ctx) => {
  ctx.reply("Select exchange filter:", {
    reply_markup: {
      keyboard: [
        ["ALL"],
        ["BINANCE", "MEXC"],
        ["BYBIT", "OKX"],
        ["KUCOIN", "GATE"],
        ["COINEX", "POLONIEX"],
        ["XT", "BITMART"],
        ["LBANK"],
        ["⬅ Back"]
      ],
      resize_keyboard: true
    }
  });
});




const availableFilters = [
  "ALL","BINANCE","MEXC","BYBIT","OKX",
  "KUCOIN","GATE","COINEX","POLONIEX",
  "XT","BITMART","LBANK",
  "PHEMEX","OURBIT"
];




bot.hears(availableFilters, (ctx) => {
  const id = ctx.chat.id;
  const selected = ctx.message.text;


  userFilters[id] = [selected];


  ctx.reply(`✅ Filter set to: ${selected}`, {
    reply_markup: {
      keyboard: [
        ["📈 Track Exchange Listings"],
        ["⚙️ Filter Exchanges"]
      ],
      resize_keyboard: true
    }
  });
});




bot.hears("⬅ Back", (ctx) => {
  ctx.reply("Main Menu", {
    reply_markup: {
      keyboard: [
        ["📈 Track Exchange Listings"],
        ["⚙️ Filter Exchanges"],
        ["📢 Channel (Coming Soon)"]
      ],
      resize_keyboard: true
    }
  });
});






bot.hears("📢 Channel (Coming Soon)", (ctx) => {
  ctx.reply(
`🚧 Channel Feature Coming Soon!


Soon we will launch:
✔ Official CEXPing Telegram Channel
✔ Auto listing posts
✔ Faster alerts


Stay tuned 🔥`
  );
});






// =========================
// SUBSCRIBE
// =========================
bot.hears("📈 Track Exchange Listings", (ctx) => {
  const id = ctx.chat.id;

  if (!subscribers.includes(id)) {
    subscribers.push(id);
  }

  if (!userFilters[id]) {
    userFilters[id] = ["ALL"];
  }

  if (!userAlertMode[id]) {
    userAlertMode[id] = "BOTH";
  }

  ctx.reply(`🔍 CEXPING_SCANNER ACTIVATED
Filter: ${userFilters[id][0]}
Mode: ${userAlertMode[id]}`);
});








// =========================
// ALERT SENDER
// =========================
function sendAlert(exchange, info, source) {
  if (subscribers.length === 0) return;

  const msg = `
🚨 NEW CEX LISTING ALERT

Exchange: ${exchange}
Info: ${info}
Time: ${getTime()}
Source: ${source}

Powered by CEXPing
`;

  subscribers.forEach(id => {

    const filters = userFilters[id] || ["ALL"];
    const mode = userAlertMode[id] || "BOTH";

    if (mode === "ALPHA") return;

    if (
      filters.includes("ALL") ||
      filters.includes(exchange)
    ) {
      bot.telegram.sendMessage(id, msg);
    }

  });
}



// =========================
// ALPHA ALERT SENDER
// =========================
function sendAlphaAlert(symbol, chain, address, url) {

  const hash = symbol + address;
  if (seenAlpha.has(hash)) return;
  seenAlpha.add(hash);

  const msg = `
🧪 CEX ALPHA

$${symbol} found on Gate Alpha

Chain: ${chain}
Contract: ${address}

[Open in Gate Alpha](${url})

Powered by CEXPing
`;

  subscribers.forEach(id => {

    const mode = userAlertMode[id] || "BOTH";

    if (mode === "CEX") return;

    bot.telegram.sendMessage(id, msg, {
      parse_mode: "Markdown"
    });

  });
}




// =========================
// GATE ALPHA
// =========================
async function checkGateAlpha() {
  try {

    const res = await axios.get("https://www.gate.com/alpha");
    const $ = cheerio.load(res.data);

    $("a[href*='/alpha/']").each((i, el) => {

      const link = "https://www.gate.com" + $(el).attr("href");

      const text = $(el).text().trim();
      const symbol = text.replace("$","").split(" ")[0];

      const address = link.split("/alpha/")[1];

      if (symbol && address) {
        sendAlphaAlert(symbol, "Solana", address, link);
      }

    });

  } catch (err) {
    console.log("Gate Alpha error");
  }
}



// =========================
// BINANCE
// =========================
async function checkBinance() {
  try {
    const res = await axios.get(
      "https://www.binance.com/bapi/composite/v1/public/cms/article/list/query",
      { params: { type: 1, catalogId: 48, pageNo: 1, pageSize: 1 } }
    );


    const art = res.data?.data?.articles?.[0];
    if (art && art.title !== lastAlerts.binance) {
      lastAlerts.binance = art.title;
      sendAlert("BINANCE", art.title, "Website");
    }
  } catch {}
}


// =========================
// MEXC SITE
// =========================
async function checkMexcSite() {
  try {
    const res = await axios.get(
      "https://www.mexc.com/api/platform/notice/api/v1/notice/list",
      { params: { category: 1, pageSize: 1 } }
    );


    const art = res.data?.data?.[0];
    if (art && art.title !== lastAlerts.mexcSite) {
      lastAlerts.mexcSite = art.title;
      sendAlert("MEXC", art.title, "Website");
    }
  } catch {}
}


// =========================
// MEXC X
// =========================
async function checkMexcX() {
  try {
    const res = await axios.get("https://nitter.net/MEXC_Listings");
    const $ = cheerio.load(res.data);


    const tweet = $(".timeline-item")
      .first()
      .find(".tweet-content")
      .text()
      .trim();


    if (tweet && tweet !== lastAlerts.mexcX && isListingPost(tweet)) {
      lastAlerts.mexcX = tweet;
      sendAlert("MEXC", tweet, "X");
    }
  } catch {}
}




// =========================
// BYBIT
// =========================
async function checkBybit() {
  try {
    const res = await axios.get("https://api.bybit.com/v5/announcements/index");
    const art = res.data?.result?.list?.[0];


    if (art && art.title !== lastAlerts.bybit) {
      lastAlerts.bybit = art.title;
      sendAlert("BYBIT", art.title, "API");
    }
  } catch {}
}


// =========================
// OKX
// =========================
async function checkOkx() {
  try {
    const res = await axios.get(
      "https://www.okx.com/priapi/v5/public/announcement"
    );


    const art = res.data?.data?.[0];
    if (art && art.title !== lastAlerts.okx) {
      lastAlerts.okx = art.title;
      sendAlert("OKX", art.title, "Website");
    }
  } catch {}
}


// =========================
// KUCOIN
// =========================
async function checkKucoin() {
  try {
    const res = await axios.get(
      "https://www.kucoin.com/_api/cms/articles",
      {
        params: { page: 1, pageSize: 1, category: "listing" }
      }
    );


    const art = res.data?.items?.[0];
    if (art && art.title !== lastAlerts.kucoin) {
      lastAlerts.kucoin = art.title;
      sendAlert("KUCOIN", art.title, "Website");
    }
  } catch {}
}


// =========================
// GATE.IO
// =========================
async function checkGate() {
  try {
    const res = await axios.get(
      "https://www.gate.io/api/v4/announcements",
      { params: { type: "listing", limit: 1 } }
    );


    const art = res.data?.[0];
    if (art && art.title !== lastAlerts.gate) {
      lastAlerts.gate = art.title;
      sendAlert("GATE", art.title, "Website");
    }
  } catch {}
}


// =========================
// COINEX
// =========================
async function checkCoinEx() {
  try {
    const res = await axios.get("https://www.coinex.com/res/notice/list");


    const art = res.data?.data?.list?.[0];
    if (art && art.title !== lastAlerts.coinex) {
      lastAlerts.coinex = art.title;
      sendAlert("COINEX", art.title, "Website");
    }
  } catch {}
}


// =========================
// POLONIEX
// =========================
async function checkPoloniex() {
  try {
    const res = await axios.get("https://poloniex.com/public/announcements");


    const art = res.data?.[0];
    if (art && art.title !== lastAlerts.poloniex) {
      lastAlerts.poloniex = art.title;
      sendAlert("POLONIEX", art.title, "Website");
    }
  } catch {}
}


// =========================
// XT
// =========================
async function checkXT() {
  try {
    const res = await axios.get("https://www.xt.com/api/announcement/list");


    const art = res.data?.data?.list?.[0];
    if (art && art.title !== lastAlerts.xt) {
      lastAlerts.xt = art.title;
      sendAlert("XT", art.title, "Website");
    }
  } catch {}
}

// =========================
// BITMART
// =========================
async function checkBitmart() {
  try {
    const res = await axios.get("https://api-cloud.bitmart.com/spot/v1/notice");


    const art = res.data?.data?.notices?.[0];
    if (art && art.title !== lastAlerts.bitmart) {
      lastAlerts.bitmart = art.title;
      sendAlert("BITMART", art.title, "Website");
    }
  } catch {}
}


// =========================
// LBANK
// =========================
async function checkLbank() {
  try {
    const res = await axios.get("https://www.lbank.com/api/v2/notices");


    const art = res.data?.data?.[0];
    if (art && art.title !== lastAlerts.lbank) {
      lastAlerts.lbank = art.title;
      sendAlert("LBANK", art.title, "Website");
    }
  } catch {}
}

// =========================
// PHEMEX
// =========================
async function checkPhemex() {
  try {
    const res = await axios.get(
      "https://api.phemex.com/public/announcement/list"
    );


    const art = res.data?.data?.rows?.[0];


    if (art && art.title !== lastAlerts.phemex) {
      lastAlerts.phemex = art.title;
      sendAlert("PHEMEX", art.title, "Website");
    }
  } catch {}
}

// =========================
// OURBIT
// =========================
async function checkOurbit() {
  try {
    const res = await axios.get(
      "https://www.ourbit.com/api/v1/announcement/list"
    );


    const art = res.data?.data?.list?.[0];


    if (art && art.title !== lastAlerts.ourbit) {
      lastAlerts.ourbit = art.title;
      sendAlert("OURBIT", art.title, "Website");
    }
  } catch {}
}

// =========================
// BINANCE X
// =========================
async function checkBinanceX() {
  try {
    const res = await axios.get("https://nitter.net/binance");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.binanceX && isListingPost(tweet)) {
      lastAlerts.binanceX = tweet;
      sendAlert("BINANCE", tweet, "X");
    }
  } catch {}
}

// =========================
// BYBIT X
// =========================
async function checkBybitX() {
  try {
    const res = await axios.get("https://nitter.net/Bybit_Official");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.bybitX && isListingPost(tweet)) {
      lastAlerts.bybitX = tweet;
      sendAlert("BYBIT", tweet, "X");
    }
  } catch {}
}

// =========================
// OKX X
// =========================
async function checkOkxX() {
  try {
    const res = await axios.get("https://nitter.net/okx");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.okxX && isListingPost(tweet)) {
      lastAlerts.okxX = tweet;
      sendAlert("OKX", tweet, "X");
    }
  } catch {}
}

// =========================
// KUCOIN X
// =========================
async function checkKucoinX() {
  try {
    const res = await axios.get("https://nitter.net/kucoincom");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.kucoinX && isListingPost(tweet)) {
      lastAlerts.kucoinX = tweet;
      sendAlert("KUCOIN", tweet, "X");
    }
  } catch {}
}

// =========================
// GATE X
// =========================
async function checkGateX() {
  try {
    const res = await axios.get("https://nitter.net/gate_io");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.gateX && isListingPost(tweet)) {
      lastAlerts.gateX = tweet;
      sendAlert("GATE", tweet, "X");
    }
  } catch {}
}


// =========================
// BITMART X
// =========================
async function checkBitmartX() {
  try {
    const res = await axios.get("https://nitter.net/BitMartExchange");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.bitmartX && isListingPost(tweet)) {
      lastAlerts.bitmartX = tweet;
      sendAlert("BITMART", tweet, "X");
    }
  } catch {}
}

// =========================
// LBANK X
// =========================
async function checkLbankX() {
  try {
    const res = await axios.get("https://nitter.net/LBank_Exchange");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.lbankX && isListingPost(tweet)) {
      lastAlerts.lbankX = tweet;
      sendAlert("LBANK", tweet, "X");
    }
  } catch {}
}

// =========================
// XT X
// =========================
async function checkXtX() {
  try {
    const res = await axios.get("https://nitter.net/XTexchange");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.xtX && isListingPost(tweet)) {
      lastAlerts.xtX = tweet;
      sendAlert("XT", tweet, "X");
    }
  } catch {}
}

// =========================
// PHEMEX X
// =========================
async function checkPhemexX() {
  try {
    const res = await axios.get("https://nitter.net/phemex_official");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.phemexX && isListingPost(tweet)) {
      lastAlerts.phemexX = tweet;
      sendAlert("PHEMEX", tweet, "X");
    }
  } catch {}
}

// =========================
// COINEX X
// =========================
async function checkCoinexX() {
  try {
    const res = await axios.get("https://nitter.net/coinexcom");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.coinexX && isListingPost(tweet)) {
      lastAlerts.coinexX = tweet;
      sendAlert("COINEX", tweet, "X");
    }
  } catch {}
}

// =========================
// POLONIEX X
// =========================
async function checkPoloniexX() {
  try {
    const res = await axios.get("https://nitter.net/Poloniex");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.poloniexX && isListingPost(tweet)) {
      lastAlerts.poloniexX = tweet;
      sendAlert("POLONIEX", tweet, "X");
    }
  } catch {}
}

// =========================
// OURBIT X
// =========================
async function checkOurbitX() {
  try {
    const res = await axios.get("https://nitter.net/ourbit_official");
    const $ = cheerio.load(res.data);
    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();


    if (tweet && tweet !== lastAlerts.ourbitX && isListingPost(tweet)) {
      lastAlerts.ourbitX = tweet;
      sendAlert("OURBIT", tweet, "X");
    }
  } catch {}
}

// =========================
// LOOP
// =========================
setInterval(() => {


  // Websites
  checkBinance();
  checkMexcSite();
  checkBybit();
  checkOkx();
  checkKucoin();
  checkGate();
  checkCoinEx();
  checkPoloniex();
  checkXT();
  checkBitmart();
  checkLbank();
  checkPhemex();
  checkOurbit();


  // X (Twitter)
  checkBinanceX();
  checkBybitX();
  checkOkxX();
  checkKucoinX();
  checkMexcX();


  checkGateX();
checkBitmartX();
checkLbankX();
checkXtX();
checkPhemexX();


checkCoinexX();
checkPoloniexX();
checkOurbitX();

checkGateAlpha();

}, 60000);

// =========================
// BOT START
// =========================
bot.launch();
console.log("CEXPing Bot Running...");
