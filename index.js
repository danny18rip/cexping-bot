require("dotenv").config();
const { Telegraf } = require("telegraf");
const axios = require("axios");
const cheerio = require("cheerio");
const http = require("http");

// GLOBAL AXIOS SETTINGS
axios.defaults.headers.common = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
};
axios.defaults.timeout = 15000; // Lower timeout to prevent hanging

// RAILWAY HEALTH CHECK (Fixes the "App not found" 404 on Railway)
http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("CEXPing Bot Alive");
}).listen(process.env.PORT || 3000, "0.0.0.0");

const bot = new Telegraf(process.env.BOT_TOKEN);

// DATA STORAGE
let subscribers = [];
const lastAlerts = {};
const userFilters = {};
const userAlertMode = {};
const globalSeen = new Set();
const seenAlpha = new Set();

const POSITIVE_WORDS = ["list", "listing", "new listing", "will list", "trading opens", "spot trading"];
const NEGATIVE_WORDS = ["delist", "delisting", "maintenance", "upgrade", "suspend"];

function isListingPost(text) {
    if (!text) return false;
    const t = text.toLowerCase();
    return POSITIVE_WORDS.some(w => t.includes(w)) && !NEGATIVE_WORDS.some(w => t.includes(w));
}

function getTime() {
    return new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
}

// SENDER LOGIC
function sendAlert(exchange, info, source) {
    const key = (exchange + info).toLowerCase();
    if (globalSeen.has(key)) return;
    globalSeen.add(key);

    const msg = `🚨 *NEW CEX LISTING ALERT*\n\n*Exchange:* ${exchange}\n*Info:* ${info}\n*Time:* ${getTime()}\n*Source:* ${source}\n\nPowered by CEXPing`;

    subscribers.forEach(id => {
        const filters = userFilters[id] || ["ALL"];
        if (userAlertMode[id] === "ALPHA") return;
        if (filters.includes("ALL") || filters.includes(exchange)) {
            bot.telegram.sendMessage(id, msg, { parse_mode: "Markdown" }).catch(() => {});
        }
    });
}

// --- SCRAPERS ---

async function checkBinance() {
    try {
        const res = await axios.get("https://www.binance.com/bapi/composite/v1/public/cms/article/list/query?type=1&catalogId=48&pageNo=1&pageSize=1");
        const art = res.data?.data?.articles?.[0];
        if (art && art.title !== lastAlerts.binance) {
            lastAlerts.binance = art.title;
            sendAlert("BINANCE", art.title, "Official API");
        }
    } catch (e) { console.error("Binance API error"); }
}

async function checkMexcSite() {
    try {
        const res = await axios.get("https://www.mexc.com/support/sections/360000547811-New-Listings");
        const $ = cheerio.load(res.data);
        const el = $("a").filter((i, el) => $(el).text().includes("Listing")).first();
        const title = el.text().trim();
        if (title && title !== lastAlerts.mexcSite) {
            lastAlerts.mexcSite = title;
            sendAlert("MEXC", title, "Website");
        }
    } catch (e) { console.error("MEXC Site error"); }
}

// Nitter Scraper with Extra Protection (The 404 culprit)
async function checkNitter(account, lastKey, exchangeName) {
    try {
        // We try a random nitter instance to avoid 404s
        const instances = ['nitter.net', 'nitter.cz', 'nitter.privacydev.net'];
        const instance = instances[Math.floor(Math.random() * instances.length)];
        const res = await axios.get(`https://${instance}/${account}`);
        if (!res.data) return;
        
        const $ = cheerio.load(res.data);
        const tweet = $(".tweet-content").first().text().trim();

        if (tweet && tweet !== lastAlerts[lastKey] && isListingPost(tweet)) {
            lastAlerts[lastKey] = tweet;
            sendAlert(exchangeName, tweet, "X (via Nitter)");
        }
    } catch (e) {
        console.log(`Nitter error for ${account}: ${e.message}`);
    }
}

// MAIN LOOP
setInterval(async () => {
    console.log("Heartbeat: Checking for updates...");
    
    // API & Website Sources (Reliable)
    await checkBinance();
    await checkMexcSite();
    // Add others here...

    // X/Twitter Sources (Unreliable - handled individually)
    await checkNitter("binance", "binanceX", "BINANCE");
    await checkNitter("MEXC_Listings", "mexcX", "MEXC");
    await checkNitter("kucoincom", "kucoinX", "KUCOIN");
    
}, 120000); // Check every 2 minutes to avoid IP bans

// TELEGRAM COMMANDS
bot.start((ctx) => {
    subscribers.push(ctx.chat.id);
    ctx.reply("📡 CEXPing Bot Activated. Tracking all listings.");
});

bot.launch();
console.log("Bot Started Successfully");