/**
 * Système d'Internationalisation (i18n) - SmartCabb Site Web
 * Support: Français (fr) et Anglais (en)
 */

class I18n {
    constructor() {
        this.currentLang = this.getStoredLanguage() || this.detectLanguage();
        this.translations = window.translations || {};
        this.init();
    }

    /**
     * Initialiser le système i18n
     */
    init() {
        // Appliquer la langue sauvegardée ou détectée
        this.setLanguage(this.currentLang);
        
        // Écouter les changements de langue
        document.addEventListener('languageChanged', (e) => {
            this.setLanguage(e.detail.language);
        });

        console.log('✅ i18n initialisé - Langue:', this.currentLang);
    }

    /**
     * Détecter la langue du navigateur
     */
    detectLanguage() {
        const browserLang = navigator.language || navigator.userLanguage;
        
        // Français : fr, fr-FR, fr-CD, fr-BE, etc.
        if (browserLang.startsWith('fr')) {
            return 'fr';
        }
        
        // Anglais : en, en-US, en-GB, etc.
        if (browserLang.startsWith('en')) {
            return 'en';
        }
        
        // Par défaut : Français (langue locale RDC)
        return 'fr';
    }

    /**
     * Récupérer la langue sauvegardée
     */
    getStoredLanguage() {
        return localStorage.getItem('smartcabb_language');
    }

    /**
     * Sauvegarder la langue
     */
    storeLanguage(lang) {
        localStorage.setItem('smartcabb_language', lang);
    }

    /**
     * Changer la langue
     */
    setLanguage(lang) {
        if (!this.translations[lang]) {
            console.warn(`Langue "${lang}" non disponible, utilisation de "fr"`);
            lang = 'fr';
        }

        this.currentLang = lang;
        this.storeLanguage(lang);
        
        // Mettre à jour l'attribut lang du HTML
        document.documentElement.lang = lang;
        
        // Traduire tous les éléments
        this.translatePage();
        
        // Mettre à jour le sélecteur de langue
        this.updateLanguageSelector();
        
        // Émettre un événement
        window.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
    }

    /**
     * Traduire toute la page
     */
    translatePage() {
        // Traduire tous les éléments avec data-i18n
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const translation = this.translate(key);
            
            if (translation) {
                element.textContent = translation;
            }
        });

        // Traduire les placeholders
        const placeholders = document.querySelectorAll('[data-i18n-placeholder]');
        placeholders.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const translation = this.translate(key);
            
            if (translation) {
                element.placeholder = translation;
            }
        });

        // Traduire les attributs title
        const titles = document.querySelectorAll('[data-i18n-title]');
        titles.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const translation = this.translate(key);
            
            if (translation) {
                element.title = translation;
            }
        });

        // Traduire les attributs alt
        const alts = document.querySelectorAll('[data-i18n-alt]');
        alts.forEach(element => {
            const key = element.getAttribute('data-i18n-alt');
            const translation = this.translate(key);
            
            if (translation) {
                element.alt = translation;
            }
        });

        // Traduire les meta tags
        this.updateMetaTags();
    }

    /**
     * Traduire une clé
     */
    translate(key) {
        // La structure est: translations[key][lang]
        if (this.translations[key] && this.translations[key][this.currentLang]) {
            return this.translations[key][this.currentLang];
        }
        
        // Fallback sur le français si la traduction n'existe pas
        if (this.translations[key] && this.translations[key]['fr']) {
            return this.translations[key]['fr'];
        }
        
        console.warn(`Traduction manquante pour la clé: ${key}`);
        return key;
    }

    /**
     * Raccourci pour translate
     */
    t(key) {
        return this.translate(key);
    }

    /**
     * Mettre à jour les meta tags
     */
    updateMetaTags() {
        // Description
        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription) {
            metaDescription.content = this.translate('meta.description');
        }

        // Keywords
        const metaKeywords = document.querySelector('meta[name="keywords"]');
        if (metaKeywords) {
            metaKeywords.content = this.translate('meta.keywords');
        }

        // Open Graph
        const ogDescription = document.querySelector('meta[property="og:description"]');
        if (ogDescription) {
            ogDescription.content = this.translate('meta.description');
        }

        // Twitter
        const twitterDescription = document.querySelector('meta[property="twitter:description"]');
        if (twitterDescription) {
            twitterDescription.content = this.translate('meta.description');
        }
    }

    /**
     * Mettre à jour le sélecteur de langue
     */
    updateLanguageSelector() {
        const buttons = document.querySelectorAll('[data-lang]');
        buttons.forEach(button => {
            const lang = button.getAttribute('data-lang');
            if (lang === this.currentLang) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }

    /**
     * Obtenir la langue courante
     */
    getCurrentLanguage() {
        return this.currentLang;
    }

    /**
     * Obtenir toutes les langues disponibles
     */
    getAvailableLanguages() {
        return Object.keys(this.translations);
    }
}

/**
 * Créer le sélecteur de langue
 */
function createLanguageSelector() {
    const selector = document.createElement('div');
    selector.className = 'language-selector';
    selector.innerHTML = `
        <button class="lang-btn" data-lang="fr" title="Français">
            <span class="flag">🇨🇩</span>
            <span class="lang-text">FR</span>
        </button>
        <button class="lang-btn" data-lang="en" title="English">
            <span class="flag">🇬🇧</span>
            <span class="lang-text">EN</span>
        </button>
    `;

    // Ajouter les événements
    selector.querySelectorAll('.lang-btn').forEach(button => {
        button.addEventListener('click', () => {
            const lang = button.getAttribute('data-lang');
            window.i18n.setLanguage(lang);
        });
    });

    return selector;
}

/**
 * Initialiser i18n au chargement de la page
 */
function initI18n() {
    // Créer l'instance i18n globale
    window.i18n = new I18n();

    // Chercher un sélecteur existant
    let existingSelector = document.querySelector('.language-selector');
    
    // Si pas de sélecteur existant, en créer un
    if (!existingSelector) {
        const nav = document.querySelector('nav');
        if (nav) {
            const selector = createLanguageSelector();
            nav.appendChild(selector);
            existingSelector = selector;
        }
    }
    
    // Ajouter les événements sur tous les boutons de langue
    if (existingSelector) {
        existingSelector.querySelectorAll('[data-lang]').forEach(button => {
            button.addEventListener('click', () => {
                const lang = button.getAttribute('data-lang');
                window.i18n.setLanguage(lang);
            });
        });
    }

    console.log('✅ Système i18n prêt');
}

// Auto-initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initI18n);
} else {
    initI18n();
}

// Export pour utilisation
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, createLanguageSelector, initI18n };
}
