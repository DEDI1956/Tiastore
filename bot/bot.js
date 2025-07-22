const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs-extra');
const path = require('path');
const { telegramToken } = require('../config');
const { createGmailAccount } = require('./gmailCreator');

// Inisialisasi Bot
const bot = new TelegramBot(telegramToken, { polling: true });

// Data untuk menyimpan state percakapan
const userState = {};

// Teks Pesan
const welcomeMessage = `
Selamat Datang di Gmail Creator Bot!

**Peraturan Penggunaan:**
1. Gunakan bot ini dengan bijak.
2. Jangan menyalahgunakan untuk aktivitas ilegal atau spam.
3. Satu pengguna hanya dapat membuat beberapa akun dalam rentang waktu tertentu untuk menghindari pemblokiran.

**Tujuan Bot:**
Bot ini dirancang untuk membantu membuat akun Gmail secara otomatis untuk keperluan pengembangan atau pribadi.

**Risiko Penggunaan:**
- Pembuatan akun dapat gagal jika Google mendeteksi aktivitas otomatis (misalnya, meminta verifikasi telepon).
- Akun yang dibuat mungkin memiliki batasan atau memerlukan verifikasi lebih lanjut.
- Penggunaan berlebihan dapat menyebabkan pemblokiran sementara dari Google.

Silakan pilih salah satu opsi di bawah ini:
`;

// Opsi Tombol Inline
const startKeyboard = {
    inline_keyboard: [
        [
            { text: 'Daftar Gmail', callback_data: 'register_gmail' },
            { text: 'List Gmail', callback_data: 'list_gmail' }
        ]
    ]
};

// Handler untuk perintah /start
bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: startKeyboard
    });
});

// Handler untuk Callback Query (Tombol Inline)
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const chatId = msg.chat.id;
    const data = callbackQuery.data;

    bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'register_gmail') {
        userState[chatId] = { step: 'awaiting_name' };
        bot.sendMessage(chatId, 'Silakan masukkan Nama Lengkap untuk akun Gmail:');
    } else if (data === 'list_gmail') {
        try {
            const accountsPath = path.join(__dirname, '../data/accounts.json');
            const accounts = await fs.readJson(accountsPath);
            if (accounts.length === 0) {
                bot.sendMessage(chatId, 'Belum ada akun yang terdaftar.');
                return;
            }

            let table = '`Daftar Akun Gmail`\n';
            table += '`----------------------------------`\n';
            table += '`No. | Nama                 | Email`\n';
            table += '`----------------------------------`\n';
            accounts.forEach((acc, index) => {
                table += `\`${(index + 1).toString().padEnd(3)} | ${acc.name.padEnd(20)} | ${acc.email}\`\n`;
            });
            table += '`----------------------------------`\n';

            bot.sendMessage(chatId, table, { parse_mode: 'Markdown' });
        } catch (error) {
            bot.sendMessage(chatId, 'Gagal membaca daftar akun. Pastikan file `data/accounts.json` ada.');
        }
    }
});

// Handler untuk pesan teks (mengelola proses pendaftaran)
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    // Abaikan perintah /start agar tidak diproses di sini
    if (text.startsWith('/start')) {
        return;
    }

    if (userState[chatId]) {
        const state = userState[chatId];

        if (state.step === 'awaiting_name') {
            state.name = text;
            state.step = 'awaiting_password';
            bot.sendMessage(chatId, 'Nama telah disimpan. Sekarang, silakan masukkan Password yang Anda inginkan:');
        } else if (state.step === 'awaiting_password') {
            const name = state.name;
            const password = text;

            // Reset state
            delete userState[chatId];

            bot.sendMessage(chatId, 'Terima kasih. Permintaan Anda sedang diproses. Ini mungkin memakan waktu beberapa menit...');

            try {
                const result = await createGmailAccount(name, password);
                if (result.success) {
                    bot.sendMessage(chatId, `Akun berhasil dibuat!\n\nEmail: ${result.email}\nPassword: ${result.password}\n\nData telah disimpan.`);
                } else {
                    throw new Error(result.message);
                }
            } catch (error) {
                bot.sendMessage(chatId, `Maaf, terjadi kesalahan saat membuat akun: \n\n\`${error.message}\` \n\nSilakan coba lagi nanti.`, { parse_mode: 'Markdown' });
            }
        }
    }
});

console.log('Bot sedang berjalan...');
