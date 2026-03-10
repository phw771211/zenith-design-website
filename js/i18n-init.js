// Initialize i18next
let currentLanguage = localStorage.getItem('language') || 'en';

// Detect language from browser if not set
if (!localStorage.getItem('language')) {
    const browserLang = navigator.language.split('-')[0];
    if (['en', 'zh', 'ja'].includes(browserLang)) {
        currentLanguage = browserLang;
    } else if (browserLang === 'zh' && navigator.language.includes('CN')) {
        currentLanguage = 'zh';
    }
}

// Load translations
const translations = {
    en: {},
    zh: {},
    ja: {}
};

// Fetch translation files
Promise.all([
    fetch('locales/en.json').then(r => r.json()),
    fetch('locales/zh-CN.json').then(r => r.json()),
    fetch('locales/ja.json').then(r => r.json())
]).then(([en, zh, ja]) => {
    translations.en = en;
    translations.zh = zh;
    translations.ja = ja;
    
    // Initialize i18next
    i18next.init({
        lng: currentLanguage,
        fallbackLng: 'en',
        debug: false,
        resources: {
            en: { translation: en },
            zh: { translation: zh },
            ja: { translation: ja }
        }
    }, (err, t) => {
        if (err) {
            console.error('i18next init error:', err);
        } else {
            // Translate page
            translatePage();
            
            // Set active language button
            document.querySelectorAll('.lang-option').forEach(btn => {
                if (btn.dataset.lang === currentLanguage) {
                    btn.classList.add('active');
                }
            });
            
            // Update HTML lang attribute
            document.documentElement.lang = currentLanguage;
        }
    });
}).catch(err => console.error('Failed to load translations:', err));

// Translate all elements with data-i18n attribute
function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.dataset.i18n;
        const translation = i18next.t(key);
        
        // Check if element is input or textarea
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            element.placeholder = translation;
        } else {
            // For elements with HTML (like hero title with <br>)
            if (key === 'hero.title') {
                element.innerHTML = translation;
            } else if (key === 'footer.copyright') {
                element.innerHTML = translation;
            } else {
                element.textContent = translation;
            }
        }
    });
}

// Language change handler
function changeLanguage(lang) {
    currentLanguage = lang;
    localStorage.setItem('language', lang);
    
    i18next.changeLanguage(lang, () => {
        translatePage();
        document.documentElement.lang = lang;
        
        // Update active button
        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.lang === lang) {
                btn.classList.add('active');
            }
        });
        
        // Close dropdown
        const dropdown = document.getElementById('lang-dropdown');
        if (dropdown) {
            dropdown.classList.remove('active');
        }
    });
}

// Make functions global
window.changeLanguage = changeLanguage;
window.translatePage = translatePage;
