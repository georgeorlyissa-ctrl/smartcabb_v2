/**
 * Sélecteur de Langue pour SmartCabb Site Web
 * Compatible avec le système i18n existant
 * Version corrigée : fonctionne avec les boutons HTML existants
 */

class LanguageSelector {
    constructor() {
        this.currentLang = localStorage.getItem('smartcabb_lang') || 'fr';
        this.init();
    }

    init() {
        // Attendre que le DOM soit complètement chargé
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                this.setup();
            });
        } else {
            this.setup();
        }
    }

    setup() {
        // Chercher le sélecteur existant dans le HTML (ancien ou nouveau style)
        const existingSelector = document.querySelector('.language-selector');
        const existingDropdown = document.querySelector('.language-dropdown');
        
        if (existingDropdown) {
            console.log('✅ Dropdown de langue trouvé dans le HTML');
            this.attachDropdownEventListeners();
        } else if (existingSelector) {
            console.log('✅ Sélecteur de langue trouvé dans le HTML');
            this.attachEventListeners();
        } else {
            console.log('⚠️ Sélecteur non trouvé, création automatique');
            this.createSelector();
        }
        
        // Appliquer la langue sauvegardée
        this.applyLanguage(this.currentLang);
        
        // Mettre à jour l'apparence du bouton actif
        this.updateActiveButton();
        
        // Mettre à jour le dropdown si présent
        this.updateDropdownDisplay();
        
        console.log('✅ Sélecteur de langue initialisé:', this.currentLang);
    }

    attachDropdownEventListeners() {
        // Gérer le dropdown de langue
        const dropdownBtn = document.getElementById('languageDropdownBtn');
        const dropdownMenu = document.getElementById('languageDropdownMenu');
        const dropdown = document.querySelector('.language-dropdown');
        const dropdownItems = document.querySelectorAll('.language-dropdown-item');
        
        if (!dropdownBtn || !dropdownMenu) {
            console.warn('⚠️ Éléments du dropdown non trouvés');
            return;
        }

        // Toggle du menu au clic sur le bouton
        dropdownBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropdown.classList.toggle('open');
            console.log('🔽 Dropdown toggled');
        });

        // Fermer le dropdown si on clique ailleurs
        document.addEventListener('click', (e) => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });

        // Gérer les clics sur les items du dropdown
        dropdownItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const lang = item.dataset.lang || item.getAttribute('data-lang');
                
                if (lang) {
                    console.log('🌍 Clic sur item dropdown:', lang);
                    this.changeLanguage(lang);
                    dropdown.classList.remove('open');
                } else {
                    console.error('❌ Attribut data-lang manquant sur l\'item');
                }
            });
        });

        console.log(`✅ Événements dropdown attachés à ${dropdownItems.length} items`);
    }

    attachEventListeners() {
        // Attacher les événements aux boutons existants
        const langButtons = document.querySelectorAll('.lang-btn');
        
        if (langButtons.length === 0) {
            console.warn('⚠️ Aucun bouton .lang-btn trouvé');
            return;
        }

        langButtons.forEach(btn => {
            // Supprimer les anciens événements pour éviter les duplications
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            
            // Ajouter le nouvel événement
            newBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const lang = e.currentTarget.dataset.lang || e.currentTarget.getAttribute('data-lang');
                
                if (lang) {
                    console.log('🌍 Clic sur bouton langue:', lang);
                    this.changeLanguage(lang);
                } else {
                    console.error('❌ Attribut data-lang manquant sur le bouton');
                }
            });
        });

        console.log(`✅ Événements attachés à ${langButtons.length} boutons`);
    }

    createSelector() {
        // Créer le sélecteur HTML si absent
        const selector = document.createElement('div');
        selector.className = 'language-selector';
        selector.style.cssText = 'display: flex !important; border: 2px solid #00BFA5 !important; box-shadow: 0 2px 10px rgba(0, 191, 165, 0.2) !important;';
        selector.innerHTML = `
            <button class="lang-btn active" data-lang="fr">FR</button>
            <button class="lang-btn" data-lang="en">EN</button>
        `;

        // Injecter dans la navigation
        const navMenu = document.querySelector('.nav-menu');
        if (navMenu) {
            navMenu.appendChild(selector);
            this.attachEventListeners();
        } else {
            console.error('❌ .nav-menu non trouvé');
        }
    }

    changeLanguage(lang) {
        if (!lang || lang === this.currentLang) {
            console.log('⚠️ Langue identique ou invalide:', lang);
            return;
        }

        console.log(`🔄 Changement de langue: ${this.currentLang} → ${lang}`);

        this.currentLang = lang;
        localStorage.setItem('smartcabb_lang', lang);
        
        // Appliquer la langue
        this.applyLanguage(lang);
        
        // Mettre à jour les boutons
        this.updateActiveButton();
        
        // Mettre à jour l'affichage du dropdown
        this.updateDropdownDisplay();
        
        // Émettre un événement personnalisé pour le système i18n
        const event = new CustomEvent('languageChanged', {
            detail: { language: lang }
        });
        document.dispatchEvent(event);

        console.log('✅ Langue changée avec succès:', lang);
        
        // Notification visuelle
        this.showLanguageChangeNotification(lang);
    }

    showLanguageChangeNotification(lang) {
        // Créer une notification visuelle temporaire
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: #00BFA5;
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-weight: 600;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = lang === 'fr' ? '🇨🇩 Français' : '🇬🇧 English';
        
        document.body.appendChild(notification);
        
        // Supprimer après 2 secondes
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transition = 'opacity 0.3s';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }

    applyLanguage(lang) {
        console.log('📝 Application de la langue:', lang);

        // Mettre à jour l'attribut lang du document
        document.documentElement.lang = lang;

        // Compter les traductions appliquées
        let translatedCount = 0;

        // Traduire tous les éléments avec data-i18n
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.dataset.i18n;
            const translation = this.getTranslation(key, lang);
            
            if (translation) {
                // Gérer les différents types d'éléments
                if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
                    element.placeholder = translation;
                } else if (element.tagName === 'BUTTON' && !element.classList.contains('lang-btn')) {
                    // Ne pas traduire les boutons de langue eux-mêmes
                    element.textContent = translation;
                } else if (!element.classList.contains('lang-btn')) {
                    element.textContent = translation;
                }
                translatedCount++;
            } else {
                console.warn(`⚠️ Traduction manquante pour la clé: ${key}`);
            }
        });

        // Traduire les attributs title
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.dataset.i18nTitle;
            const translation = this.getTranslation(key, lang);
            if (translation) {
                element.title = translation;
                translatedCount++;
            }
        });

        // Traduire les placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.dataset.i18nPlaceholder;
            const translation = this.getTranslation(key, lang);
            if (translation) {
                element.placeholder = translation;
                translatedCount++;
            }
        });

        console.log(`✅ ${translatedCount} éléments traduits en ${lang.toUpperCase()}`);

        if (translatedCount === 0) {
            console.warn('⚠️ Aucun élément traduit ! Vérifiez que les attributs data-i18n sont présents et que window.translations est chargé.');
        }
    }

    getTranslation(key, lang) {
        // Vérifier que les traductions sont chargées
        if (!window.translations) {
            console.error('❌ window.translations non trouvé ! Assurez-vous que translations-new-design.js est chargé.');
            return null;
        }

        // Accéder à la traduction via la clé
        if (window.translations[key]) {
            return window.translations[key][lang] || window.translations[key]['fr'];
        }
        
        return null;
    }

    updateActiveButton() {
        const langButtons = document.querySelectorAll('.lang-btn');
        
        langButtons.forEach(btn => {
            const btnLang = btn.dataset.lang || btn.getAttribute('data-lang');
            
            if (btnLang === this.currentLang) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Mettre à jour aussi les items du dropdown
        const dropdownItems = document.querySelectorAll('.language-dropdown-item');
        dropdownItems.forEach(item => {
            const itemLang = item.dataset.lang || item.getAttribute('data-lang');
            
            if (itemLang === this.currentLang) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });

        console.log(`🎨 Bouton actif mis à jour: ${this.currentLang.toUpperCase()}`);
    }

    updateDropdownDisplay() {
        // Mettre à jour l'affichage du bouton principal du dropdown
        const currentFlag = document.getElementById('currentFlag');
        const currentLangText = document.getElementById('currentLang');
        
        if (currentFlag && currentLangText) {
            if (this.currentLang === 'fr') {
                currentFlag.textContent = 'FR';
                currentLangText.textContent = 'Français';
            } else if (this.currentLang === 'en') {
                currentFlag.textContent = 'EN';
                currentLangText.textContent = 'English';
            }
            console.log('🎨 Affichage dropdown mis à jour:', this.currentLang);
        }
    }
}

// Initialiser le sélecteur au chargement de la page
(function() {
    console.log('🚀 Chargement du sélecteur de langue...');
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.languageSelector = new LanguageSelector();
        });
    } else {
        window.languageSelector = new LanguageSelector();
    }
})();
