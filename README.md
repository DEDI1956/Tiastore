# Telegram Gmail Bot

Bot Telegram untuk membuat dan mendaftar akun Gmail secara otomatis menggunakan Puppeteer.

## Prasyarat

- Server VPS (disarankan Ubuntu 20.04 atau lebih baru)
- Node.js (v16 atau lebih baru)
- npm

## Instalasi di VPS

1.  **Clone atau Upload Proyek**

    Upload semua file proyek ini ke direktori di VPS Anda, misalnya `/root/gmail-bot`.

2.  **Masuk ke Direktori Proyek**
    ```bash
    cd /root/gmail-bot
    ```

3.  **Install Dependensi**

    Jalankan perintah berikut untuk menginstal semua paket yang dibutuhkan. Puppeteer mungkin membutuhkan beberapa dependensi sistem tambahan, yang akan coba diinstal secara otomatis oleh `npm`.
    ```bash
    npm install
    ```
    Jika instalasi Puppeteer gagal karena dependensi yang hilang, Anda mungkin perlu menginstalnya secara manual di Ubuntu:
    ```bash
    sudo apt-get update
    sudo apt-get install -yq gconf-service libasound2 libatk1.0-0 libc6 libcairo2 libcups2 libdbus-1-3 \
    libexpat1 libfontconfig1 libgcc1 libgconf-2-4 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk-3-0 libnspr4 \
    libpango-1.0-0 libpangocairo-1.0-0 libstdc++6 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 \
    libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxrandr2 libxrender1 libxss1 libxtst6 \
    ca-certificates fonts-liberation libappindicator1 libnss3 lsb-release xdg-utils wget
    ```
    Setelah itu, coba jalankan `npm install` lagi.

4.  **Konfigurasi Token Bot**

    Buka file `config.js` dan ganti `YOUR_TELEGRAM_BOT_TOKEN` dengan token bot Telegram Anda yang sebenarnya.
    ```javascript
    // config.js
    module.exports = {
        telegramToken: 'ganti_dengan_token_bot_anda'
    };
    ```

## Menjalankan Bot

Setelah instalasi dan konfigurasi selesai, Anda dapat menjalankan bot dengan perintah:

```bash
npm start
```

Untuk menjaga bot tetap berjalan bahkan setelah Anda menutup terminal SSH, disarankan menggunakan manajer proses seperti `pm2`.

### Menjalankan dengan PM2

1.  **Install PM2 secara global:**
    ```bash
    npm install pm2 -g
    ```

2.  **Jalankan bot menggunakan PM2:**
    ```bash
    pm2 start bot/bot.js --name "gmail-bot"
    ```

3.  **Monitor Log (opsional):**
    ```bash
    pm2 logs gmail-bot
    ```

4.  **Simpan proses agar berjalan saat startup:**
    ```bash
    pm2 save
    pm2 startup
    ```
