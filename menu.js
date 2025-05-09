const readline = require('readline');

// ANSI Color Codes
const color = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

function showMenu() {
    console.clear();
    console.log(`${color.yellow}===== Selamat Datang di Bot ChainOpera AI =====${color.reset}`);
    console.log("1. Check-in saja");
    console.log("2. Chat otomatis");
    console.log("3. Eksekusi keduanya");
    console.log("\nSilakan pilih mode (1/2/3): ");
}

function startInteractiveMenu(mainFunction) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    showMenu();

    rl.on('line', async (input) => {
        const choice = input.trim();

        if (!['1', '2', '3'].includes(choice)) {
            console.log(`${color.red}[!] Pilihan tidak valid. Masukkan 1, 2, atau 3.${color.reset}\n`);
            showMenu();
            return;
        }

        let mode = '';
        switch (choice) {
            case '1':
                mode = 'checkin';
                break;
            case '2':
                mode = 'chat';
                break;
            case '3':
                mode = 'both';
                break;
            default:
                console.error(`${color.red}[!] Mode tidak dikenali${color.reset}`);
                return;
        }

        console.log(`\nMemulai bot dalam mode: ${color.green}${mode.toUpperCase()}${color.reset}`);
        await mainFunction(mode);
        rl.close();
    });
}

module.exports = { startInteractiveMenu };