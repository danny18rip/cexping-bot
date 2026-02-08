const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");

const bot = new Telegraf(process.env.BOT_TOKEN);

// =========================
// SUBSCRIBERS
// =========================
let subscribers = [];
const lastAlerts = {};

// USER FILTERS
const userFilters = {};



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
          ["⚙️ Filter Exchanges"],
          ["📢 Channel (Coming Soon)"]
        ],
        resize_keyboard: true
      }
    }
  );
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

    if (!userFilters[id]) {
      userFilters[id] = ["ALL"];
    }

    ctx.reply(`🔍 CEXPING_SCANNER ACTIVATED
Filter: ${userFilters[id][0]}`);
  } else {
    ctx.reply("⚡ CEXPING_SCANNER already running");
  }
});



// =========================
// ALERT SENDER
// =========================
function sendAlert(exchange, info, source) {
  if (subscribers.length === 0) return;

  const msg =
`🚨 NEW CEX LISTING ALERT

Exchange: ${exchange}
Info: ${info}
Time: ${getTime()}
Source: ${source}

Powered by CEXPing`;

  subscribers.forEach(id => {

  const filters = userFilters[id] || ["ALL"];

  if (
    filters.includes("ALL") ||
    filters.includes(exchange)
  ) {
    bot.telegram.sendMessage(id, msg);
  }

});

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

    if (tweet && tweet !== lastAlerts.mexcX && tweet.toLowerCase().includes("list")) {
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
// LOOP
// =========================
setInterval(() => {
  checkBinance();
  checkMexcSite();
  checkMexcX();
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


}, 60000);



// =========================
// BOT START
// =========================
bot.launch();
console.log("CEXPing Bot Running...");
