const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");

const bot = new Telegraf(process.env.BOT_TOKEN);

// =========================
// SUBSCRIBERS
// =========================
let subscribers = [];

// store last alerts
const lastAlerts = {};

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
// START
// =========================
bot.start((ctx) => {
  ctx.reply(
`📡 Welcome to CEXPing Bot
Catch the pump before it starts!

⚠️ This bot does NOT store users.
Restart = Resubscribe`,
    {
      reply_markup: {
        keyboard: [["📈 Track Exchange Listings"]],
        resize_keyboard: true
      }
    }
  );
});

// =========================
// SUBSCRIBE
// =========================
bot.hears("📈 Track Exchange Listings", (ctx) => {
  const id = ctx.chat.id;
  if (!subscribers.includes(id)) {
    subscribers.push(id);
    ctx.reply("🔍 CEXPING_SCANNER ACTIVATED");
  }
});

// =========================
// ALERT SENDER
// =========================
function sendAlert(exchange, info, source) {
  const msg = 
`🚨 NEW CEX LISTING ALERT

Exchange: ${exchange}
Info: ${info}
Time: ${getTime()}
Source: ${source}
Powered by CEXPing`;

  subscribers.forEach(id => {
    bot.telegram.sendMessage(id, msg);
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

    const art = res.data.data.articles[0];
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

    const art = res.data.data[0];
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

    const tweet = $(".timeline-item").first().find(".tweet-content").text().trim();

    if (!tweet) return;

    if (tweet !== lastAlerts.mexcX && tweet.toLowerCase().includes("list")) {
      lastAlerts.mexcX = tweet;
      sendAlert("MEXC", tweet, "X");
    }
  } catch {}
}

// =========================
// BYBIT SPOT
// =========================
async function checkBybitSpot() {
  try {
    const res = await axios.get("https://api.bybit.com/v5/announcements/index");

    const art = res.data.result.list[0];
    if (art && art.title !== lastAlerts.bybitSpot) {
      lastAlerts.bybitSpot = art.title;
      sendAlert("BYBIT (SPOT)", art.title, "API");
    }
  } catch {}
}

// =========================
// BYBIT FUTURES
// =========================
async function checkBybitFutures() {
  try {
    const res = await axios.get("https://api.bybit.com/v5/announcements/index");

    const art = res.data.result.list[1];
    if (art && art.title !== lastAlerts.bybitFutures) {
      lastAlerts.bybitFutures = art.title;
      sendAlert("BYBIT (FUTURES)", art.title, "API");
    }
  } catch {}
}


// =========================
// OKX SPOT
// =========================
async function checkOkxSpot() {
  try {
    const res = await axios.get(
      "https://www.okx.com/priapi/v5/public/announcement"
    );

    const art = res.data.data[0];
    if (art && art.title !== lastAlerts.okxSpot) {
      lastAlerts.okxSpot = art.title;
      sendAlert("OKX (SPOT)", art.title, "Website");
    }
  } catch {}
}

// =========================
// OKX FUTURES
// =========================
async function checkOkxFutures() {
  try {
    const res = await axios.get(
      "https://www.okx.com/priapi/v5/public/announcement"
    );

    const art = res.data.data[1];
    if (art && art.title !== lastAlerts.okxFutures) {
      lastAlerts.okxFutures = art.title;
      sendAlert("OKX (FUTURES)", art.title, "Website");
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
  checkBybitSpot();
  checkBybitFutures();

  checkOkxSpot();
  checkOkxFutures();

}, 60000);


bot.launch();
console.log("CEXPing Bot Running...");

setTimeout(() => {
  sendAlert(
    "TEST-EXCHANGE",
    "TESTCOIN/USDT will be listed",
    "Manual Test"
  );
}, 5000);
