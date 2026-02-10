require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");
const fs = require("fs");

// 1. RAILWAY PORT BINDING (The "Keep-Alive" Fix)
// This prevents the SIGTERM error by telling Railway the bot is healthy.
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end("CEXPing Bot is Operational");
}).listen(PORT, "0.0.0.0", () => {
    console.log(`Health check server listening on port ${PORT}`);
});

// 2. DATABASE SETUP
const DB_FILE = "./subscribers.json";
let subscribers = [];
if (fs.existsSync(DB_FILE)) {
    try {
        subscribers = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
    } catch (e) { subscribers = []; }
}
function saveSubscribers() {
    fs.writeFileSync(DB_FILE, JSON.stringify(subscribers), "utf8");
}



// 3. BOT CONFIGURATION
const bot = new Telegraf(process.env.BOT_TOKEN);
const lastAlerts = {};
const globalSeen = new Set();

// 4. THE 10 EXCHANGE SCRAPERS
async function checkBinance() {
    try {
        const res = await axios.get("https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=1");
        const art = res.data?.data?.articles?.[0];
        if (art && art.title !== lastAlerts.binance) {
            lastAlerts.binance = art.title;
            sendAlert("BINANCE", art.title, "Official API");
        }
    } catch (e) {}
}

async function checkMexc() {
    try {
        const res = await axios.get("https://www.mexc.com/support/sections/360000547811-New-Listings");
        const $ = cheerio.load(res.data);
        const title = $("a").filter((i, el) => $(el).text().includes("Listing")).first().text().trim();
        if (title && title !== lastAlerts.mexc) {
            lastAlerts.mexc = title;
            sendAlert("MEXC", title, "Website");
        }
    } catch (e) {}
}

async function checkBybit() {
    try {
        const res = await axios.get("https://api.bybit.com/v5/announcements/index?locale=en-US&category=new_crypto");
        const art = res.data?.result?.list?.[0];
        if (art && art.title !== lastAlerts.bybit) {
            lastAlerts.bybit = art.title;
            sendAlert("BYBIT", art.title, "Official API");
        }
    } catch (e) {}
}

async function checkKucoin() {
    try {
        const res = await axios.get("https://www.kucoin.com/_api/cms/articles?page=1&pageSize=1&category=listing&lang=en_US");
        const art = res.data?.data?.items?.[0];
        if (art && art.title !== lastAlerts.kucoin) {
            lastAlerts.kucoin = art.title;
            sendAlert("KUCOIN", art.title, "Official API");
        }
    } catch (e) {}
}

async function checkOkx() {
    try {
        const res = await axios.get("https://www.okx.com/v2/support/home/announcements/list?size=1&id=13");
        const art = res.data?.data?.list?.[0];
        if (art && art.title !== lastAlerts.okx) {
            lastAlerts.okx = art.title;
            sendAlert("OKX", art.title, "Official API");
        }
    } catch (e) {}
}

async function checkGate() {
    try {
        const res = await axios.get("https://www.gate.io/api_proxy/v1/announcement/list?page=1&limit=1&type=listing");
        const art = res.data?.data?.list?.[0];
        if (art && art.title !== lastAlerts.gate) {
            lastAlerts.gate = art.title;
            sendAlert("GATE.IO", art.title, "Official API");
        }
    } catch (e) {}
}

async function checkBitget() {
    try {
        const res = await axios.get("https://www.bitget.com/api/v1/support/announcement/list?noticeTypeId=162&pageSize=1");
        const art = res.data?.data?.list?.[0];
        if (art && art.annTitle !== lastAlerts.bitget) {
            lastAlerts.bitget = art.annTitle;
            sendAlert("BITGET", art.annTitle, "Official API");
        }
    } catch (e) {}
}

async function checkLbank() {
    try {
        const res = await axios.get("https://support.lbank.site/hc/en-gb/sections/900000302103-New-Listing");
        const $ = cheerio.load(res.data);
        const title = $(".article-list-item").first().text().trim();
        if (title && title !== lastAlerts.lbank) {
            lastAlerts.lbank = title;
            sendAlert("LBANK", title, "Website");
        }
    } catch (e) {}
}

async function checkBitmart() {
    try {
        const res = await axios.get("https://support.bitmart.com/hc/en-us/sections/360000908874-New-Listings");
        const $ = cheerio.load(res.data);
        const title = $(".article-list-item").first().text().trim();
        if (title && title !== lastAlerts.bitmart) {
            lastAlerts.bitmart = title;
            sendAlert("BITMART", title, "Website");
        }
    } catch (e) {}
}

async function checkXT() {
    try {
        const res = await axios.get("https://xtsupport.zendesk.com/hc/en-us/sections/900000043823-New-Listing");
        const $ = cheerio.load(res.data);
        const title = $(".article-list-item").first().text().trim();
        if (title && title !== lastAlerts.xt) {
            lastAlerts.xt = title;
            sendAlert("XT.COM", title, "Website");
        }
    } catch (e) {}
}

// 5. ALERT DISPATCHER
function sendAlert(exchange, info, source) {
    const key = (exchange + info).toLowerCase();
    if (globalSeen.has(key)) return;
    globalSeen.add(key);

    const msg = `🚨 *NEW CEX LISTING ALERT*\n\n*Exchange:* ${exchange}\n*Info:* ${info}\n*Source:* ${source}\n\nPowered by CEXPing`;

    subscribers.forEach(id => {
        bot.telegram.sendMessage(id, msg, { parse_mode: "Markdown" }).catch(err => {
            if (err.description?.includes("blocked")) {
                subscribers = subscribers.filter(s => s !== id);
                saveSubscribers();
            }
        });
    });
}

// 6. MAIN SCANNING LOOP
setInterval(async () => {
    console.log("Heartbeat: Checking all 10 exchanges...");
    await checkBinance(); await checkMexc(); await checkBybit();
    await checkKucoin(); await checkOkx(); await checkGate();
    await checkBitget(); await checkLbank(); await checkBitmart(); await checkXT();
}, 60000);

// 7. BOT COMMANDS
bot.start((ctx) => {
    if (!subscribers.includes(ctx.chat.id)) {
        subscribers.push(ctx.chat.id);
        saveSubscribers();
    }
    ctx.reply("📡 Welcome to CEXPing Bot\nTracking 10 Exchanges globally.", {
        reply_markup: {
            keyboard: [["📈 Track Exchange Listings"], ["⚙️ Filter Exchanges"], ["📢 Channel (Coming Soon)"]],
            resize_keyboard: true
        }
    });
});

bot.hears("📈 Track Exchange Listings", (ctx) => ctx.reply("🔍 Scanner is LIVE. Monitoring Binance, MEXC, Bybit, KuCoin, OKX, Gate, Bitget, LBank, Bitmart, and XT."));

// 8. FINAL LAUNCH LOGIC (Clears old sessions)
bot.launch().then(() => {
    console.log("🚀 Bot is LIVE on Railway tracking 10 Exchanges!");
});

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));