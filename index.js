const { Telegraf } = require("telegraf");
const axios = require("axios");

const bot = new Telegraf("8520591945:AAEzCLehvLX2cULzEIbM9rUH65Sh63hU6go");




// =========================
// SUBSCRIBERS MEMORY
// =========================
let subscribers = [];

let lastBinance = "";
let lastMexc = "";
let lastKucoin = "";

// =========================
// START
// =========================
bot.start((ctx) => {
  ctx.reply("📡 Welcome to CEXPing Bot\nCatch the pump before it starts!", {
    reply_markup: {
      keyboard: [
        ["📈 Track Exchange Listings"],
        ["⚙️ Settings"]
      ],
      resize_keyboard: true
    }
  });
});

// =========================
// SUBSCRIBE
// =========================
bot.hears("📈 Track Exchange Listings", (ctx) => {
  const id = ctx.chat.id;

  if (!subscribers.includes(id)) {
    subscribers.push(id);
    ctx.reply(
      "🔍 CEXPING_V1.0_SCANNER ACTIVATED\nMonitoring CEX listings in real-time..."
    );
  } else {
    ctx.reply(
      "⚡ CEXPING_V1.0_SCANNER already running"
    );
  }
});


// =========================
// SEND TO ALL
// =========================
function broadcast(msg) {
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
      {
        params: { type: 1, catalogId: 48, pageNo: 1, pageSize: 1 }
      }
    );

    const art = res.data.data.articles[0];
    if (!art) return;

    if (art.title !== lastBinance) {
      lastBinance = art.title;
      broadcast(
        `🚨 BINANCE LISTING\n\n${art.title}\nhttps://www.binance.com/en/support/announcement/${art.code}`
      );
    }
  } catch {}
}

// =========================
// MEXC
// =========================
async function checkMexc() {
  try {
    const res = await axios.get(
      "https://www.mexc.com/api/platform/notice/api/v1/notice/list",
      { params: { category: 1, pageSize: 1 } }
    );

    const art = res.data.data[0];
    if (!art) return;

    if (art.title !== lastMexc) {
      lastMexc = art.title;
      broadcast(
        `🚨 MEXC LISTING\n\n${art.title}\nhttps://www.mexc.com/support/articles/${art.id}`
      );
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
      { params: { page: 1, pageSize: 1, category: "listing" } }
    );

    const art = res.data.items[0];
    if (!art) return;

    if (art.title !== lastKucoin) {
      lastKucoin = art.title;
      broadcast(
        `🚨 KUCOIN LISTING\n\n${art.title}\nhttps://www.kucoin.com/news/${art.path}`
      );
    }
  } catch {}
}

// =========================
// LOOP
// =========================
setInterval(() => {
  checkBinance();
  checkMexc();
  checkKucoin();
}, 60000);

bot.launch();
console.log("Bot running...");
