// Bahasa Indonesia: every screen, sheet and message has no English left (except what stays English on purpose),
// dates use Indonesian months, switching back to English needs no reload, and CSV headers stay English.
import { URL, checks, launch, sleep, SAMPLE_PRODUCTS } from './lib.mjs';

const { check, done } = checks();
const browser = await launch();
const page = await browser.newPage({ viewport: { width: 412, height: 892 }, acceptDownloads: true });
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

// English words that appear in the UI. Payment method names, product names, CNTR and the language names stay as they are.
const ENGLISH = /\b(the|and|your|you|tap|add|sales?|events?|day|days|products?|expenses?|revenue|profit|settings|backup|export|restore|cancel|save|delete|edit|compare|history|sell|today|yesterday|start|end|undo|name|price|cost|colou?r|methods?|theme|language|sound|money|about|version|license|privacy|show|next|skip|quit|finish|none|never|last|phone|hidden|counter|manage|items?|margin|net|deficit|busiest|hour|between|units|sold|not|yet|no|new|past|current|live|picker|hue|preset|close|back|done|looks|light|dark|setting|compact|amounts?|currency|replace|everything|choose|pick)\b/i;
const KEEP = /\b(Cash|QRIS|Transfer|Card|E-wallet|CNTR|English|Bahasa Indonesia|Gacha|Cheki|Poster|Photocard|Sticker|Acrylic Stand|Keychain|Tote Bag|Booth rental|MIT|ITMERowe|Preact|Capacitor|SQLite|Lucide|Plus Jakarta Sans|ISC|SIL|Open Font License)\b/g;

/** Visible English left in the active screen and any open sheet or bubble. */
const leftovers = () =>
  page.evaluate(([english, keep]) => {
    const roots = [document.querySelector('.screen.active'), document.querySelector('.topbar'), document.querySelector('.tabbar'), ...document.querySelectorAll('.sheet-overlay.open .sheet, .tour-bubble, .toast.show')].filter(Boolean);
    const found = new Set();
    for (const root of roots) {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const el = node.parentElement;
        if (!el || !el.getClientRects().length || el.closest('#languageSelect, [data-user-text]')) continue;
        const text = node.textContent.replace(new RegExp(keep, 'g'), ' ');
        if (new RegExp(english, 'i').test(text)) found.add(node.textContent.trim().slice(0, 50));
      }
      for (const el of root.querySelectorAll('[aria-label], [title], [placeholder]')) {
        for (const attribute of ['aria-label', 'title', 'placeholder']) {
          const value = (el.getAttribute(attribute) ?? '').replace(new RegExp(keep, 'g'), ' ');
          if (new RegExp(english, 'i').test(value)) found.add(`${attribute}="${value.trim().slice(0, 40)}"`);
        }
      }
    }
    return [...found];
  }, [ENGLISH.source, KEEP.source]);

const tab = (id) => page.click(`.tabbar .tab[data-tab="${id}"]`);
const confirm = () => page.click('#confirmModalConfirmBtn');
const screens = [];
const look = async (label) => {
  await sleep(250);
  screens.push([label, await leftovers()]);
};

await page.goto(URL);
await page.evaluate((products) => {
  localStorage.clear();
  localStorage.setItem('cntrMeta.tutorialOffered', 'test');
  localStorage.cntrProducts = JSON.stringify(JSON.parse(products).slice(0, 3));
  localStorage.cntrSettings = JSON.stringify({ language: 'id' });
}, SAMPLE_PRODUCTS);
await page.reload();
await sleep(1000);

// Sell, with sales and an undo toast
await look('Sell (empty counts)');
for (let i = 0; i < 3; i++) await page.click('.tile .pay-add');
await look('Sell with sales');
await page.click('.tile [data-action="minus"]');
await look('Sell after undo (toast)');
// Event: expenses, End day, the End event sheets
await tab('eventScreen');
await look('Event');
await page.click('#openAddExpenseBtn');
await look('Add expense sheet');
await page.fill('#eventCostName', 'Booth rental');
await page.fill('#eventCostAmount', '50000');
await page.click('#addCostBtn');
await page.click('#endDayBtn');
await look('End day confirm');
await confirm();
await tab('salesScreen');
await page.click('.tile .pay-add');
await tab('eventScreen');
await look('Event with two days');
const month = await page.evaluate(() => document.querySelector('#eventCard .day-sub')?.textContent ?? '');
check('dates use Indonesian month names', /\b(Jan|Feb|Mar|Apr|Mei|Jun|Jul|Agu|Sep|Okt|Nov|Des)\b/.test(month), month);
await page.click('#endEventBtn');
await look('End event name sheet');
await page.fill('#saveModalInput', 'Pameran');
await page.click('#saveModalSaveBtn');
await look('End event confirm');
await confirm();
// History, a past event, edit mode, Compare
await tab('salesScreen');
await page.click('.tile .pay-add');
await tab('eventScreen');
await page.click('#endEventBtn');
await page.fill('#saveModalInput', 'Bazar');
await page.click('#saveModalSaveBtn');
await confirm();
await tab('historyScreen');
await look('History');
await page.click('#pastEventList .event-row >> nth=0');
await look('Past event');
await page.click('#pastEventEditBtn');
await look('Past event edit');
await page.click('#pastEventCancelBtn');
await page.click('#pastEventDeleteBtn');
await look('Delete event confirm');
await page.click('#confirmModalCancelBtn');
await page.click('#pastEventBackBtn');
await page.click('#compareEventsBtn');
await look('Compare picker');
await page.click('#compareModalList .check-row >> nth=0');
await page.click('#compareModalList .check-row >> nth=1'); // compares as soon as the 2nd is ticked
await look('Compare');
// Settings, Products, the product editor, About, a message
await tab('settingsScreen');
await look('Settings');
await tab('productHistoryScreen');
await look('Products');
await page.click('#productsAddBtn');
await look('Product editor');
await page.click('#removeProductBtn').catch(() => {});
await page.click('#closeEditBtn');
await tab('settingsScreen');
await page.click('#openAboutMenuBtn');
await look('About');
await page.click('#aboutBackBtn');
await page.click('#startTutorialBtn');
await look('Show tutorial confirm');
await page.click('#confirmModalCancelBtn');

const english = screens.filter(([, found]) => found.length);
check(`no English left on ${screens.length} screens, sheets and messages in Bahasa Indonesia`, english.length === 0, english.map(([label, found]) => `${label}: ${found.join(' / ')}`).join(' || '));

// The CSV stays English for spreadsheets
const [download] = await Promise.all([page.waitForEvent('download'), page.click('#exportCsvBtn')]);
const csv = (await (await download.createReadStream()).toArray()).join('');
check('CSV column headers stay English in Bahasa Indonesia', csv.replace(/^﻿/, '').startsWith('Event,Day,Time,Product,Payment,Price,Cost'), csv.slice(0, 60));
await page.click('#confirmModalConfirmBtn').catch(() => {});

// Back to English without a reload
await page.selectOption('#languageSelect', 'en');
await sleep(200);
const back = await page.evaluate(() => ({ settings: document.querySelector('#settingsScreen .page-title').textContent, tab: document.querySelector('.tabbar .tab[data-tab="historyScreen"] .tab-label').textContent }));
check('switching to English updates the screen without a reload', back.settings === 'Settings' && back.tab === 'History', back);

check('no uncaught exceptions', errors.length === 0, errors.join(' | '));
await browser.close();
done();
