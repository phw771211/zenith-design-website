/**
 * setLanguage.js — BackstopJS onReadyScript
 * Forces English language so QA always compares against the English Figma references.
 * Flow: set localStorage → reload page → wait for i18next to re-render in English.
 */
module.exports = async (page, scenario, vp) => {
  await page.evaluate(() => {
    window.localStorage.setItem('language', 'en');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
};
