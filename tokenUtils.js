// tokenUtils.js

// === COLOR CODES ===
const color = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

function decodeToken(token) {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return null;

        const base64Url = parts[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            Buffer.from(base64, 'base64')
                .toString()
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );

        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error("Gagal decode token:", error.message);
        return null;
    }
}

function getTokenExpiry(token) {
    const payload = decodeToken(token);

    if (!payload) return null;

    const exp = payload.exp ? payload.exp * 1000 : null;
    const expiredTime = payload.expiredTime ? parseInt(payload.expiredTime) : null;

    let expiryTimestamp = null;

    if (exp) {
        expiryTimestamp = exp;
    } else if (expiredTime && !isNaN(expiredTime)) {
        expiryTimestamp = expiredTime;
    }

    if (expiryTimestamp) {
        const now = Date.now();
        const diffDays = Math.floor((expiryTimestamp - now) / (1000 * 60 * 60 * 24));

        return {
            isValid: expiryTimestamp > now,
            expiryDate: new Date(expiryTimestamp),
            diffDays
        };
    }

    return null;
}

function checkTokenValidity(token) {
    const expiryInfo = getTokenExpiry(token);

    if (!expiryInfo) {
        console.warn("[!] Tidak bisa baca masa berlaku token");
        return false;
    }

    const { isValid, expiryDate, diffDays } = expiryInfo;
    const formattedExpiry = expiryDate.toLocaleString();

    if (isValid) {
        console.log(`${color.green}✅ Token valid → Kadaluarsa pada: ${formattedExpiry} (${diffDays} hari lagi)${color.reset}`);
        return true;
    } else {
        console.error(`${color.red}❌ Token kadaluarsa sejak: ${formattedExpiry}${color.reset}`);
        return false;
    }
}

module.exports = {
    getTokenExpiry,
    checkTokenValidity
};