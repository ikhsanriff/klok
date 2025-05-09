// bot.js - ChainOpera AI Auto Chat & Checkin

// === MODULES ===
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

// === COLOR CODES ===
const color = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

// Import fungsi token
const { checkTokenValidity } = require('./tokenUtils');

// === CONFIGURABLE PARTS ===
const CONFIG = {
    MAIN_URL: 'https://chat.chainopera.ai/api/agentopera ',
    CHECKIN_URL: 'https://chat.chainopera.ai/api/agent/ai-terminal-check-in ',
    MAX_CHAT_PER_TOKEN: 10,
    CHAT_INTERVAL: 10000, // ms (10 detik antar pesan)
    REQUEST_TIMEOUT: 60000,
    MAX_RETRIES: 5,
    TOKEN_FILE: 'token.txt',
    PROMPT_FILE: 'prompts.txt',
    LLM_API_KEY: 'sk-03ec8895789744eca4c12b63384e28d4', // ambil dari Network tab
};

// === READ FILES ===
function getAllTokens() {
    try {
        const content = fs.readFileSync(CONFIG.TOKEN_FILE, 'utf8');
        return content.split('\n').map(t => t.trim()).filter(Boolean);
    } catch (e) {
        console.error('[Error] Tidak bisa baca token.txt:', e.message);
        process.exit(1);
    }
}

function getAllPrompts() {
    try {
        const content = fs.readFileSync(CONFIG.PROMPT_FILE, 'utf8');
        return content.split('\n').map(p => p.trim()).filter(Boolean);
    } catch (e) {
        console.error('[Error] Tidak bisa baca prompts.txt:', e.message);
        process.exit(1);
    }
}

// === UTILITY FUNCTIONS ===
function createHeaders(token) {
    return {
        'Accept': '*/*',
        'Content-Type': 'application/json',
        'Origin': 'https://chat.chainopera.ai ',
        'Referer': 'https://chat.chainopera.ai/chat ',
        'Sec-Ch-Ua': '"Google Chrome";v="135", "Not-A.Brand";v="8", "Chromium";v="135"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36',
        'Cookie': `auth_token=${token}`,
        'X-Terminal-Source': '2',
        'X-Llm-Api-Key': CONFIG.LLM_API_KEY
    };
}

function validateToken(token) {
    return token && token.split('.').length === 3;
}

function createApiClient(token) {
    return axios.create({
        baseURL: CONFIG.MAIN_URL,
        headers: createHeaders(token),
        timeout: CONFIG.REQUEST_TIMEOUT
    });
}

// === CHECK-IN ===
async function checkIn(token) {
    try {
        const client = axios.create({
            baseURL: CONFIG.CHECKIN_URL,
            headers: createHeaders(token),
            timeout: CONFIG.REQUEST_TIMEOUT
        });

        const response = await client.post('');
        if (response.data?.checkIn === true) {
            console.log(`${color.green}[✓] Check-in berhasil!${color.reset}`);
            return true;
        } else {
            console.log('[ℹ] Hari ini sudah check-in.');
            return true;
        }
    } catch (e) {
        console.error(`${color.red}[✗] Gagal check-in: ${e.message}${color.reset}`);
        return false;
    }
}

// === SEND MESSAGE ===
async function sendMessage(client, message, conversationId = null, userId = '') {
    const payload = {
        id: conversationId || uuidv4(), // Gunakan ID lama atau buat baru
        messages: [{
            role: "user",
            content: message
        }],
        model: "chainopera-default",   // Model yang benar
        agentName: "Auto",              // Sesuaikan dengan browser
        group: "web",                   // Harus ada
        userId: userId                  // Diambil dari JWT
    };

    for (let attempt = 0; attempt < CONFIG.MAX_RETRIES; attempt++) {
        try {
            const response = await client.post('', payload);

            if (response.status === 200) {
                console.log(`${color.green}[✓] Pesan terkirim: ${message}${color.reset}`);
                return payload.id; // Kembalikan ID yang kita buat sendiri
            } else {
                throw new Error('Server merespons dengan status tidak sesuai.');
            }
        } catch (error) {
            console.error(`${color.red}[✗] Gagal kirim pesan "${message}" (percobaan ${attempt + 1}/${CONFIG.MAX_RETRIES})${color.reset}`);

            if ((error.code === 'ECONNABORTED' || error.message.includes('timeout')) && attempt < CONFIG.MAX_RETRIES - 1) {
                await delay((attempt + 1) * 2000);
            } else {
                if (error.response) {
                    console.error("Server Response:", error.response.status, error.response.data);
                } else {
                    console.error("Error Detail:", error.message);
                }
            }
        }
    }

    return conversationId || payload.id;
}
// === DELAY FUNCTION ===
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// === EXTRACT USER ID FROM JWT ===
function extractUserIdFromToken(token) {
    try {
        const parts = token.split('.');
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return decoded.id.toString();
    } catch (e) {
        console.warn("[!] Tidak bisa ambil userID dari token");
        return '';
    }
}

// === MAIN BOT FUNCTION ===
async function runBotWithToken(token, index, total) {
    console.log(`\n=== Token ${index + 1}/${total} ===`);

    if (!validateToken(token)) {
        console.error(`[!] Token tidak valid, dilewati.`);
        return;
    }

    if (!checkTokenValidity(token)) {
        console.error(`[!] Token kadaluarsa atau invalid → dilewati.`);
        return;
    }

    const userId = extractUserIdFromToken(token);
    const client = createApiClient(token);
    const prompts = getAllPrompts();

    if (prompts.length === 0) {
        console.error(`[!] Tidak ada prompt di prompts.txt`);
        return;
    }

    let conversationId = uuidv4(); // Buat conversationId dummy
    console.log(`[+] Menggunakan conversationId: ${conversationId}`);

    for (let i = 0; i < prompts.length; i++) {
        const message = prompts[i];
        console.log(`[.] Mengirim pesan ke-${i + 1}: ${message}`);
        conversationId = await sendMessage(client, message, conversationId, userId);

        if (!conversationId) {
            console.warn(`[!] Gagal mengirim pesan ke-${i + 1}, mencoba lanjut...`);
        }

        if (i < prompts.length - 1) {
            console.log(`⏳ Menunggu ${CONFIG.CHAT_INTERVAL / 1000} detik sebelum pesan berikutnya...\n`);
            await delay(CONFIG.CHAT_INTERVAL);
        }
    }

    console.log(`[✓] Semua pesan untuk token ${index + 1} telah dikirim.`);
}

// === MODE SELECTION ===
async function main(mode = 'both') {
    const tokens = getAllTokens();

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];

        console.log(`\n🚀 Memproses akun ${i + 1}...`);

        if (mode === 'checkin' || mode === 'both') {
            await checkIn(token);
        }

        if (mode === 'chat' || mode === 'both') {
            await runBotWithToken(token, i, tokens.length);
        }
    }

    console.log('\n✅ Semua proses selesai.');
    process.exit(0);
}

// === LOAD INTERACTIVE MENU ===
const { startInteractiveMenu } = require('./menu');

async function runBotWithMode(mode) {
    console.log(`\nMemulai bot dalam mode: ${mode.toUpperCase()}`);
    await main(mode);
}

// Jalankan menu interaktif
startInteractiveMenu(runBotWithMode);