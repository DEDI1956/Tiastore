const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const accountsFilePath = path.resolve(__dirname, '../data/accounts.json');
const errorScreenshotsPath = path.resolve(__dirname, '../error_screenshots');

// Pastikan folder untuk screenshot ada
fs.ensureDirSync(errorScreenshotsPath);

async function createGmailAccount(fullName, password) {
    console.log('Memulai proses pembuatan akun...');
    const browser = await puppeteer.launch({
        headless: "new", // Menggunakan mode headless baru
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36');

    try {
        // Buka halaman pendaftaran Google
        await page.goto('https://accounts.google.com/SignUp?hl=en', { waitUntil: 'networkidle2', timeout: 60000 });

        // Tunggu dan isi nama depan
        await page.waitForSelector('input[name="firstName"]', { timeout: 30000 });
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;
        await page.type('input[name="firstName"]', firstName, { delay: 120 });
        await page.type('input[name="lastName"]', lastName, { delay: 130 });

        // Klik tombol "Next" untuk melanjutkan ke halaman berikutnya
        await page.click('button[jsname="LgbsSe"]');

        // Tunggu halaman berikutnya (input tanggal lahir)
        await page.waitForSelector('#month', { timeout: 30000 });

        // Isi tanggal lahir
        await page.select('#month', String(Math.floor(Math.random() * 12) + 1));
        await page.type('input[name="day"]', String(Math.floor(Math.random() * 28) + 1), { delay: 100 });
        await page.type('input[name="year"]', String(1990 + Math.floor(Math.random() * 10)), { delay: 110 });

        // Isi gender
        await page.waitForSelector('#gender', { timeout: 10000 });
        await page.select('#gender', '3'); // "Rather not say"
        await page.click('button[jsname="LgbsSe"]'); // Next

        // Pilih alamat Gmail
        await page.waitForSelector('div[jsname="o6uyZc"]', { timeout: 30000 });
        await page.click('div[jsname="o6uyZc"] .j2FvD');

        const selectedEmailElement = await page.$('div[jsname="o6uyZc"] .j2FvD .s2GmCe');
        let generatedEmail = await page.evaluate(el => el.textContent.trim(), selectedEmailElement) + "@gmail.com";
        console.log(`Email yang disarankan dipilih: ${generatedEmail}`);
        await page.click('button[jsname="LgbsSe"]'); // Next

        // Isi password
        await page.waitForSelector('input[name="Passwd"]', { timeout: 30000 });
        await page.type('input[name="Passwd"]', password, { delay: 100 });
        await page.type('input[name="ConfirmPasswd"]', password, { delay: 100 });
        await page.click('button[jsname="LgbsSe"]'); // Next

        // Menunggu navigasi setelah password. Ini adalah titik kritis.
        console.log('Menunggu navigasi setelah memasukkan password...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

        const currentPageUrl = page.url();
        console.log('URL saat ini:', currentPageUrl);

        if (currentPageUrl.includes('VerifyPhoneNumber') || currentPageUrl.includes('SignUpMobile')) {
            throw new Error('Google memerlukan verifikasi nomor telepon.');
        }

        // Melewati halaman "Add recovery email" dan "Add phone number" jika ada
        // Google terkadang menggunakan elemen yang sama untuk "Skip" dan "Next"
        const skipButtonSelector = 'button[jsname="LgbsSe"]';
        for (let i = 0; i < 2; i++) { // Coba lewati dua halaman (email pemulihan & no telp)
            const skipButton = await page.$(skipButtonSelector);
            if (skipButton) {
                const buttonText = await page.evaluate(el => el.textContent.trim(), skipButton);
                console.log(`Menemukan tombol: ${buttonText}`);
                await skipButton.click();
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });
                console.log(`Navigasi ke URL: ${page.url()}`);
            }
        }

        // Halaman persetujuan akhir
        await page.waitForSelector('button[jsname="LgbsSe"]', { timeout: 30000 });
        await page.click('button[jsname="LgbsSe"]'); // "I agree"

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 40000 });
        console.log('Akun berhasil dibuat:', generatedEmail);

        // Simpan ke file
        const accounts = await fs.readJson(accountsFilePath).catch(() => []);
        accounts.push({
            name: fullName,
            email: generatedEmail,
            password: password,
            createdAt: new Date().toISOString()
        });
        await fs.writeJson(accountsFilePath, accounts, { spaces: 2 });

        await browser.close();
        return { success: true, email: generatedEmail, password: password };

    } catch (error) {
        console.error('Error selama pembuatan akun:', error.message);
        const screenshotPath = path.join(errorScreenshotsPath, `error-${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`Screenshot error disimpan di: ${screenshotPath}`);

        await browser.close();
        // Mengirim pesan error yang lebih spesifik
        let errorMessage = error.message;
        if (error instanceof puppeteer.errors.TimeoutError) {
            errorMessage = `Timeout: Halaman Google tidak merespons atau strukturnya berubah. Screenshot error telah disimpan di server.`;
        }
        return { success: false, message: errorMessage };
    }
}

module.exports = { createGmailAccount };
