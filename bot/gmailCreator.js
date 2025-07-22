const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const path = require('path');

const accountsFilePath = path.join(__dirname, '../data/accounts.json');

async function createGmailAccount(fullName, password) {
    console.log('Memulai proses pembuatan akun...');
    const browser = await puppeteer.launch({
        headless: true, // Gunakan 'false' untuk debugging visual
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--single-process', //
            '--disable-gpu'
        ],
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    try {
        // Buka halaman pendaftaran Google
        await page.goto('https://accounts.google.com/SignUp?hl=en', { waitUntil: 'networkidle2' });

        // Memecah nama lengkap menjadi nama depan dan belakang
        const nameParts = fullName.split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Jika hanya ada satu kata

        // Isi nama depan dan belakang
        await page.waitForSelector('input[name="firstName"]');
        await page.type('input[name="firstName"]', firstName, { delay: 100 });
        await page.type('input[name="lastName"]', lastName, { delay: 100 });
        await page.click('button[jsname="LgbsSe"]'); // Next button

        // Isi tanggal lahir (menggunakan tanggal acak)
        await page.waitForSelector('select[id="month"]');
        await page.select('select[id="month"]', String(Math.floor(Math.random() * 12) + 1));
        await page.type('input[name="day"]', String(Math.floor(Math.random() * 28) + 1), { delay: 100 });
        await page.type('input[name="year"]', String(1990 + Math.floor(Math.random() * 10)), { delay: 100 });

        await page.waitForSelector('select[id="gender"]');
        await page.select('select[id="gender"]', '3'); // "Rather not say"
        await page.click('button[jsname="LgbsSe"]'); // Next button

        // Pilih alamat Gmail yang disarankan atau buat sendiri
        await page.waitForSelector('div[jsname="o6uyZc"]');
        // Klik pada pilihan pertama yang disarankan
        await page.click('div[jsname="o6uyZc"] .j2FvD');

        // Ambil email yang dipilih
        const selectedEmailElement = await page.$('div[jsname="o6uyZc"] .j2FvD .s2GmCe');
        let generatedEmail = await page.evaluate(el => el.textContent.trim(), selectedEmailElement);
        generatedEmail += "@gmail.com";

        await page.click('button[jsname="LgbsSe"]'); // Next

        // Isi password
        await page.waitForSelector('input[name="Passwd"]');
        await page.type('input[name="Passwd"]', password, { delay: 100 });
        await page.type('input[name="ConfirmPasswd"]', password, { delay: 100 });
        await page.click('button[jsname="LgbsSe"]'); // Next

        // Di sini Google mungkin meminta verifikasi telepon.
        // Kita coba untuk melewati ini. Jika halaman berikutnya adalah persetujuan, kita lanjut.
        // Jika tidak, kita anggap gagal.
        console.log('Menunggu navigasi setelah memasukkan password...');
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });

        const currentPageUrl = page.url();
        console.log('URL saat ini:', currentPageUrl);

        // Jika URL berisi 'SignUpMobile', berarti verifikasi telepon diperlukan.
        if (currentPageUrl.includes('SignUpMobile') || currentPageUrl.includes('VerifyPhoneNumber')) {
            throw new Error('Google memerlukan verifikasi nomor telepon. Tidak dapat melanjutkan.');
        }

        // Lewati halaman "Add recovery email"
        // Tombol "Skip" mungkin memiliki selector yang berbeda
        const skipRecoverySelector = 'button[jsname="LgbsSe"]'; // Selector yang sama dengan "Next"
        if (await page.$(skipRecoverySelector)) {
            await page.click(skipRecoverySelector);
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }

        // Lewati halaman "Add phone number"
        if (await page.$(skipRecoverySelector)) {
            await page.click(skipRecoverySelector);
            await page.waitForNavigation({ waitUntil: 'networkidle2' });
        }

        // Setuju dengan persyaratan layanan
        await page.waitForSelector('button[jsname="LgbsSe"]');
        await page.click('button[jsname="LgbsSe"]'); // "I agree"

        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 });

        console.log('Akun berhasil dibuat:', generatedEmail);

        // Simpan data ke file JSON
        const accounts = await fs.readJson(accountsFilePath);
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
        console.error('Error selama pembuatan akun:', error);
        await browser.close();
        return { success: false, message: error.message };
    }
}

module.exports = { createGmailAccount };
