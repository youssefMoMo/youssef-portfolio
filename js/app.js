/**
 * ═══════════════════════════════════════════════════════════════
 * YOUSSEF DESIGN PORTFOLIO v4.0 - Production Build
 * ═══════════════════════════════════════════════════════════════
 * 
 * Security Features:
 * - No global scope pollution (IIFE pattern)
 * - No inline event handlers
 * - XSS protection via DOM API
 * - Input sanitization
 * - Rate limiting
 * 
 * Architecture:
 * - Modular design with clear separation of concerns
 * - Defensive error handling
 * - User preference persistence
 */

(function() {
    'use strict';

    // ═══════════════════════════════════════════════════════════════
    // CONFIGURATION
    // ═══════════════════════════════════════════════════════════════
    
    const CONFIG = Object.freeze({
        GAME_PLACE_IDS: [
            '111021125092689',
            '128915436393653',
            '93605084835085',
            '116868134708688',
            '85746704401525',
            '92369489899222',
            '121873420604621'
        ],
        API_ENDPOINT: '/api/gamesData.php',
        LOADER_DELAY: 500,
        RATE_LIMIT: 10,
        RATE_WINDOW: 60000,
        DEFAULT_VOLUME: 50,
        STORAGE_KEYS: Object.freeze({
            MUSIC: 'yd_music_prefs',
            SETTINGS: 'yd_site_settings',
            LANGUAGE: 'yd_language',
            REVIEWS: 'userReviews',
            WELCOME: 'welcomeFrameShown_v4'
        })
    });

    // ═══════════════════════════════════════════════════════════════
    // UTILITY MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const Utils = {
        /**
         * Safely escape HTML to prevent XSS
         */
        escapeHtml(text) {
            if (text == null) return '';
            const div = document.createElement('div');
            div.textContent = String(text);
            return div.innerHTML;
        },

        /**
         * Sanitize user input
         */
        sanitizeInput(input, maxLength = 500) {
            if (input == null) return '';
            return String(input)
                .trim()
                .slice(0, maxLength)
                .replace(/[<>]/g, '');
        },

        /**
         * Format large numbers (1.5M, 2.3B, etc)
         */
        formatNumber(n) {
            if (n == null) return '—';
            const num = Number(n);
            if (isNaN(num)) return '—';
            if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
            if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
            if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
            return num.toLocaleString();
        },

        /**
         * Safe localStorage access
         */
        storage: {
            get(key, defaultValue = null) {
                try {
                    const item = localStorage.getItem(key);
                    return item ? JSON.parse(item) : defaultValue;
                } catch (e) {
                    console.warn('Storage read error:', e);
                    return defaultValue;
                }
            },
            set(key, value) {
                try {
                    localStorage.setItem(key, JSON.stringify(value));
                    return true;
                } catch (e) {
                    console.warn('Storage write error:', e);
                    return false;
                }
            }
        },

        /**
         * Simple rate limiter
         */
        rateLimiter: {
            requests: new Map(),
            
            canMakeRequest(key) {
                const now = Date.now();
                const requests = this.requests.get(key) || [];
                const recent = requests.filter(time => now - time < CONFIG.RATE_WINDOW);
                
                if (recent.length >= CONFIG.RATE_LIMIT) {
                    return false;
                }
                
                recent.push(now);
                this.requests.set(key, recent);
                return true;
            }
        },

        /**
         * Debounce function
         */
        debounce(fn, delay) {
            let timeoutId;
            return function(...args) {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => fn.apply(this, args), delay);
            };
        },

        /**
         * Safe element query
         */
        $(selector) {
            return document.querySelector(selector);
        },

        $$(selector) {
            return document.querySelectorAll(selector);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // REVIEWS DATA
    // ═══════════════════════════════════════════════════════════════
    
    const ReviewsData = {
        defaultReviews: [
            { name: 'schwerer', project: 'Game UI', rating: 5, text: 'affordable, fast, flexible with revisions and good quality solid', date: '2024-11', verified: true },
            { name: 'Gren', project: 'Full Game UI', rating: 5, text: 'Very fast orders and good quality', date: '2024-10', verified: true },
            { name: 'snowstorm/king', project: 'UI Design', rating: 5, text: 'good, cheap, fast, ui is high quality and more affordable', date: '2024-10', verified: true },
            { name: '10dok', project: 'Game UI', rating: 5, text: 'super good and affordable, without your ui I wouldve quit finishing my game', date: '2024-09', verified: true },
            { name: 'nilcous', project: 'Full UI Pack', rating: 4, text: 'handled everything perfectly, great experience, fast delivery. Could improve communication', date: '2024-09', verified: true },
            { name: 'CyraX', project: 'UI Commission', rating: 5, text: 'Very fast and efficient, did exactly what I want. Recommended UI artist!', date: '2024-08', verified: true },
            { name: 'ephemeralrequiem', project: 'Game Interface', rating: 5, text: 'high quality work, fast delivery and good communication', date: '2024-08', verified: true },
            { name: 'pdawgdev', project: 'Custom UI', rating: 5, text: 'high quality and fully customizable, listened to what I wanted', date: '2024-07', verified: true },
            { name: 'mystery_0001', project: 'UI Design', rating: 5, text: 'fast delivery & easy to work with, highly recommend!', date: '2024-07', verified: true }
        ],

        getAll() {
            const saved = Utils.storage.get(CONFIG.STORAGE_KEYS.REVIEWS, []);
            return [...this.defaultReviews, ...saved];
        },

        add(review) {
            const saved = Utils.storage.get(CONFIG.STORAGE_KEYS.REVIEWS, []);
            saved.push(review);
            Utils.storage.set(CONFIG.STORAGE_KEYS.REVIEWS, saved);
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // TRANSLATIONS MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const I18n = {
        currentLang: 'en',
        
        translations: {
            en: {
                'nav.home': 'Home', 'nav.portfolio': 'Portfolio', 'nav.games': 'Games',
                'nav.pricing': 'Pricing', 'nav.reviews': 'Reviews', 'nav.policies': 'Policies',
                'nav.settings': 'Settings',
                'hero.badge': 'Available for Projects',
                'hero.title': 'Welcome to my personal<br><span class="gradient-text">Portfolio</span> And Relaxing',
                'hero.subtitle': 'Professional UI/UX designer specializing in creating immersive, beautiful game interfaces that players love.',
                'hero.viewPortfolio': 'View Portfolio', 'hero.seePricing': 'See Pricing',
                'stats.projects': 'Projects Completed', 'stats.clients': 'Happy Clients',
                'stats.rating': 'Average Rating', 'stats.experience': 'Years Experience',
                'cta.title': 'Ready to Transform Your Game?',
                'cta.subtitle': 'Let\'s create something amazing together. Get in touch to discuss your project.',
                'cta.joinDiscord': 'Join Discord', 'cta.readReviews': 'Read Reviews', 'cta.viewPricing': 'View Pricing',
                'portfolio.badge': 'My Work', 'portfolio.title': 'Creative <span class="gradient-text">Portfolio</span>',
                'portfolio.subtitle': 'Explore my collection of UI designs for Roblox games.',
                'portfolio.likeIt': 'Like What You See?', 'portfolio.commission': 'Commission your own custom UI design today.',
                'games.badge': 'Live Games', 'games.title': 'Games I Designed <span class="gradient-text">UI For</span>',
                'games.totalVisits': 'Total visits across these games:', 'games.more': '...and there is more than all that',
                'games.loading': 'Loading games data from Roblox...', 'games.playNow': 'Play Now', 'games.visits': 'visits',
                'games.wantFeatured': 'Want Your Game Featured?',
                'games.commissionText': 'Commission a professional UI design and join successful Roblox games.',
                'pricing.badge': 'Transparent Pricing', 'pricing.title': 'CHOOSE YOUR <span class="gradient-text">PERFECT PLAN</span>',
                'pricing.subtitle': 'Tailored packages to match your project\'s scale and style.',
                'pricing.goWith': 'Go with this plan', 'pricing.whyChoose': 'Why choose me?',
                'pricing.whySubtitle': 'Reasons to choose my service.', 'pricing.faq': 'Frequently Asked Questions',
                'pricing.stillQuestions': 'Still have questions? I\'m here to help!',
                'reviews.badge': 'Client Feedback', 'reviews.title': 'What Clients <span class="gradient-text">Say</span>',
                'reviews.subtitle': 'Real feedback from real clients.',
                'reviews.based': 'Based on', 'reviews.reviewsText': 'reviews',
                'reviews.share': 'Share Your Experience', 'reviews.shareText': 'Worked with me? I\'d love to hear your feedback!',
                'reviews.submitReview': 'Submit Review',
                'policies.badge': 'Terms & Policies', 'policies.title': 'My <span class="gradient-text">Policies</span>',
                'policies.subtitle': 'Clear terms for a smooth collaboration.',
                'testimonials.title': 'Client Testimonials',
                'time.zone': 'Alexandria Time', 'commission.status': 'Commission Open',
                'footer.rights': 'All Rights Reserved', 'footer.by': 'Youssef Design',
                'settings.title': 'Settings', 'settings.language': 'Language', 'settings.contact': 'Contact',
                'settings.volume': 'Music Volume', 'settings.animations': 'Animations',
                'settings.animationsDesc': 'Enable animations & transitions',
                'settings.quality': 'Enhanced Quality', 'settings.qualityDesc': 'Higher visual quality'
            },
            ar: {
                'nav.home': 'الرئيسية', 'nav.portfolio': 'أعمالي', 'nav.games': 'الألعاب',
                'nav.pricing': 'الأسعار', 'nav.reviews': 'التقييمات', 'nav.policies': 'السياسات',
                'nav.settings': 'الإعدادات',
                'hero.badge': 'متاح للمشاريع',
                'hero.title': 'مرحباً بك في <br><span class="gradient-text">معرض أعمالي</span> الشخصي',
                'hero.subtitle': 'مصمم UI/UX محترف متخصص في إنشاء واجهات ألعاب غامرة وجميلة يحبها اللاعبون.',
                'hero.viewPortfolio': 'عرض الأعمال', 'hero.seePricing': 'عرض الأسعار',
                'stats.projects': 'مشروع مكتمل', 'stats.clients': 'عميل سعيد',
                'stats.rating': 'متوسط التقييم', 'stats.experience': 'سنوات الخبرة',
                'cta.title': 'مستعد لتحويل لعبتك؟',
                'cta.subtitle': 'لنصنع شيئاً مذهلاً معاً. تواصل معي لمناقشة مشروعك.',
                'cta.joinDiscord': 'انضم للديسكورد', 'cta.readReviews': 'اقرأ التقييمات', 'cta.viewPricing': 'عرض الأسعار',
                'portfolio.badge': 'أعمالي', 'portfolio.title': '<span class="gradient-text">معرض</span> الأعمال الإبداعية',
                'portfolio.subtitle': 'استكشف مجموعتي من تصاميم UI لألعاب Roblox.',
                'portfolio.likeIt': 'أعجبك ما تراه؟', 'portfolio.commission': 'اطلب تصميم UI مخصص لك اليوم.',
                'games.badge': 'ألعاب حية', 'games.title': 'ألعاب صممت <span class="gradient-text">واجهاتها</span>',
                'games.totalVisits': 'إجمالي الزيارات لهذه الألعاب:', 'games.more': '...وهناك المزيد',
                'games.loading': 'جاري تحميل بيانات الألعاب...', 'games.playNow': 'العب الآن', 'games.visits': 'زيارة',
                'games.wantFeatured': 'تريد ظهور لعبتك هنا؟',
                'games.commissionText': 'اطلب تصميم UI احترافي وانضم لألعاب Roblox الناجحة.',
                'pricing.badge': 'أسعار شفافة', 'pricing.title': 'اختر <span class="gradient-text">خطتك المثالية</span>',
                'pricing.subtitle': 'باقات مصممة لتناسب حجم وأسلوب مشروعك.',
                'pricing.goWith': 'اختر هذه الخطة', 'pricing.whyChoose': 'لماذا تختارني؟',
                'pricing.whySubtitle': 'أسباب لاختيار خدماتي.', 'pricing.faq': 'الأسئلة الشائعة',
                'pricing.stillQuestions': 'لديك أسئلة أخرى؟ أنا هنا للمساعدة!',
                'reviews.badge': 'آراء العملاء', 'reviews.title': 'ماذا يقول <span class="gradient-text">العملاء</span>',
                'reviews.subtitle': 'تقييمات حقيقية من عملاء حقيقيين.',
                'reviews.based': 'بناءً على', 'reviews.reviewsText': 'تقييم',
                'reviews.share': 'شارك تجربتك', 'reviews.shareText': 'عملت معي؟ أحب سماع رأيك!',
                'reviews.submitReview': 'إرسال تقييم',
                'policies.badge': 'الشروط والسياسات', 'policies.title': '<span class="gradient-text">سياساتي</span>',
                'policies.subtitle': 'شروط واضحة لتعاون سلس.',
                'testimonials.title': 'شهادات العملاء',
                'time.zone': 'توقيت الإسكندرية', 'commission.status': 'الطلبات مفتوحة',
                'footer.rights': 'جميع الحقوق محفوظة', 'footer.by': 'Youssef Design',
                'settings.title': 'الإعدادات', 'settings.language': 'اللغة', 'settings.contact': 'تواصل',
                'settings.volume': 'صوت الموسيقى', 'settings.animations': 'الحركات',
                'settings.animationsDesc': 'تفعيل الحركات والانتقالات',
                'settings.quality': 'جودة محسنة', 'settings.qualityDesc': 'جودة بصرية أعلى'
            },
            es: {
                'nav.home': 'Inicio', 'nav.portfolio': 'Portafolio', 'nav.games': 'Juegos',
                'nav.pricing': 'Precios', 'nav.reviews': 'Reseñas', 'nav.policies': 'Políticas',
                'nav.settings': 'Ajustes',
                'hero.badge': 'Disponible para Proyectos',
                'hero.title': 'Bienvenido a mi <br><span class="gradient-text">Portafolio</span> Personal',
                'hero.subtitle': 'Diseñador UI/UX profesional especializado en crear interfaces de juegos inmersivas y hermosas.',
                'hero.viewPortfolio': 'Ver Portafolio', 'hero.seePricing': 'Ver Precios',
                'stats.projects': 'Proyectos Completados', 'stats.clients': 'Clientes Felices',
                'stats.rating': 'Calificación Promedio', 'stats.experience': 'Años de Experiencia',
                'cta.title': '¿Listo para Transformar tu Juego?',
                'cta.subtitle': 'Creemos algo increíble juntos. Contáctame para discutir tu proyecto.',
                'cta.joinDiscord': 'Únete a Discord', 'cta.readReviews': 'Leer Reseñas', 'cta.viewPricing': 'Ver Precios',
                'portfolio.badge': 'Mi Trabajo', 'portfolio.title': '<span class="gradient-text">Portafolio</span> Creativo',
                'portfolio.subtitle': 'Explora mi colección de diseños UI para juegos de Roblox.',
                'portfolio.likeIt': '¿Te Gusta lo que Ves?', 'portfolio.commission': 'Encarga tu diseño UI personalizado hoy.',
                'games.badge': 'Juegos en Vivo', 'games.title': 'Juegos para los que Diseñé <span class="gradient-text">UI</span>',
                'games.totalVisits': 'Visitas totales en estos juegos:', 'games.more': '...y hay más',
                'games.loading': 'Cargando datos de juegos...', 'games.playNow': 'Jugar Ahora', 'games.visits': 'visitas',
                'games.wantFeatured': '¿Quieres que tu Juego Aparezca?',
                'games.commissionText': 'Encarga un diseño UI profesional y únete a los juegos exitosos de Roblox.',
                'pricing.badge': 'Precios Transparentes', 'pricing.title': 'ELIGE TU <span class="gradient-text">PLAN PERFECTO</span>',
                'pricing.subtitle': 'Paquetes adaptados a la escala y estilo de tu proyecto.',
                'pricing.goWith': 'Elegir este plan', 'pricing.whyChoose': '¿Por qué elegirme?',
                'pricing.whySubtitle': 'Razones para elegir mi servicio.', 'pricing.faq': 'Preguntas Frecuentes',
                'pricing.stillQuestions': '¿Aún tienes preguntas? ¡Estoy aquí para ayudar!',
                'reviews.badge': 'Opiniones de Clientes', 'reviews.title': 'Lo que Dicen los <span class="gradient-text">Clientes</span>',
                'reviews.subtitle': 'Opiniones reales de clientes reales.',
                'reviews.based': 'Basado en', 'reviews.reviewsText': 'reseñas',
                'reviews.share': 'Comparte tu Experiencia', 'reviews.shareText': '¿Trabajaste conmigo? ¡Me encantaría saber tu opinión!',
                'reviews.submitReview': 'Enviar Reseña',
                'policies.badge': 'Términos y Políticas', 'policies.title': 'Mis <span class="gradient-text">Políticas</span>',
                'policies.subtitle': 'Términos claros para una colaboración fluida.',
                'testimonials.title': 'Testimonios de Clientes',
                'time.zone': 'Hora de Alejandría', 'commission.status': 'Comisiones Abiertas',
                'footer.rights': 'Todos los Derechos Reservados', 'footer.by': 'Youssef Design',
                'settings.title': 'Ajustes', 'settings.language': 'Idioma', 'settings.contact': 'Contacto',
                'settings.volume': 'Volumen de Música', 'settings.animations': 'Animaciones',
                'settings.animationsDesc': 'Habilitar animaciones y transiciones',
                'settings.quality': 'Calidad Mejorada', 'settings.qualityDesc': 'Mayor calidad visual'
            }
        },

        init() {
            const saved = Utils.storage.get(CONFIG.STORAGE_KEYS.LANGUAGE, 'en');
            this.setLanguage(saved, false);
        },

        setLanguage(lang, save = true) {
            if (!this.translations[lang]) {
                lang = 'en';
            }
            
            this.currentLang = lang;
            document.documentElement.lang = lang;
            document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
            
            if (save) {
                Utils.storage.set(CONFIG.STORAGE_KEYS.LANGUAGE, lang);
            }
            
            this.updateLangButtons();
            this.translatePage();
        },

        translate(key) {
            return this.translations[this.currentLang]?.[key] 
                || this.translations.en[key] 
                || key;
        },

        translatePage() {
            Utils.$$('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const translation = this.translate(key);
                if (el.tagName === 'INPUT' && el.type !== 'checkbox') {
                    el.placeholder = translation;
                } else {
                    el.innerHTML = translation;
                }
            });
        },

        updateLangButtons() {
            Utils.$$('.lang-btn, .mobile-lang-btn').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.lang === this.currentLang);
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // TIME DISPLAY MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const TimeDisplay = {
        intervalId: null,

        init() {
            this.update();
            this.intervalId = setInterval(() => this.update(), 1000);
        },

        update() {
            const now = new Date();
            const options = { 
                timeZone: 'Africa/Cairo', 
                hour: '2-digit', 
                minute: '2-digit', 
                second: '2-digit', 
                hour12: false 
            };
            const time = now.toLocaleTimeString('en-GB', options);
            
            const mainEl = Utils.$('#alexandriaTime');
            const mobileEl = Utils.$('#mobileTime');
            
            if (mainEl) mainEl.textContent = time;
            if (mobileEl) mobileEl.textContent = time;
        },

        destroy() {
            if (this.intervalId) {
                clearInterval(this.intervalId);
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // TEMPLATES MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const Templates = {
        home() {
            return `
                <section class="hero">
                    <div class="container">
                        <div class="hero-content">
                            <div class="hero-badge"><i class="fas fa-circle" aria-hidden="true"></i> <span data-i18n="hero.badge">Available for Projects</span></div>
                            <h1 class="hero-title" data-i18n="hero.title">Welcome to my personal<br><span class="gradient-text">Portfolio</span> And Relaxing</h1>
                            <p class="hero-subtitle" data-i18n="hero.subtitle">Professional UI/UX designer specializing in creating immersive, beautiful game interfaces that players love.</p>
                            <div class="hero-buttons">
                                <a href="#portfolio" class="btn btn-primary" data-page="portfolio"><i class="fas fa-images" aria-hidden="true"></i> <span data-i18n="hero.viewPortfolio">View Portfolio</span></a>
                                <a href="#pricing" class="btn btn-secondary" data-page="pricing"><i class="fas fa-tags" aria-hidden="true"></i> <span data-i18n="hero.seePricing">See Pricing</span></a>
                            </div>
                        </div>
                    </div>
                </section>
                <section class="stats-section" aria-label="Statistics">
                    <div class="container">
                        <div class="stats-grid">
                            <article class="stat-card glass-card"><div class="stat-icon"><i class="fas fa-folder-open" aria-hidden="true"></i></div><div class="stat-number">50+</div><div class="stat-label" data-i18n="stats.projects">Projects Completed</div></article>
                            <article class="stat-card glass-card"><div class="stat-icon"><i class="fas fa-users" aria-hidden="true"></i></div><div class="stat-number">40+</div><div class="stat-label" data-i18n="stats.clients">Happy Clients</div></article>
                            <article class="stat-card glass-card"><div class="stat-icon"><i class="fas fa-star" aria-hidden="true"></i></div><div class="stat-number">4.9</div><div class="stat-label" data-i18n="stats.rating">Average Rating</div></article>
                            <article class="stat-card glass-card"><div class="stat-icon"><i class="fas fa-clock" aria-hidden="true"></i></div><div class="stat-number">3+</div><div class="stat-label" data-i18n="stats.experience">Years Experience</div></article>
                        </div>
                    </div>
                </section>
                <section class="testimonials-marquee" aria-label="Testimonials">
                    <div class="marquee-header"><h2><i class="fas fa-quote-left" aria-hidden="true"></i> <span data-i18n="testimonials.title">Client Testimonials</span></h2></div>
                    <div class="marquee-wrapper">
                        <div class="marquee-track">${this.generateMarqueeItems()}${this.generateMarqueeItems()}</div>
                    </div>
                </section>
                <section class="cta-section">
                    <div class="container">
                        <div class="cta-card glass-card">
                            <h2 data-i18n="cta.title">Ready to Transform Your Game?</h2>
                            <p data-i18n="cta.subtitle">Let's create something amazing together.</p>
                            <div class="cta-buttons">
                                <a href="https://discord.com/users/1077620522680057856" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i class="fab fa-discord" aria-hidden="true"></i> <span data-i18n="cta.joinDiscord">Join Discord</span></a>
                                <a href="#reviews" class="btn btn-secondary" data-page="reviews"><i class="fas fa-star" aria-hidden="true"></i> <span data-i18n="cta.readReviews">Read Reviews</span></a>
                            </div>
                        </div>
                    </div>
                </section>`;
        },

        generateMarqueeItems() {
            return ReviewsData.getAll().slice(0, 6).map(r => `
                <article class="marquee-item glass-card">
                    <div class="marquee-stars" aria-label="${r.rating} stars">${'<i class="fas fa-star" aria-hidden="true"></i>'.repeat(r.rating)}</div>
                    <p class="marquee-text">"${Utils.escapeHtml(r.text)}"</p>
                    <div class="marquee-author">— <span class="author-name">${Utils.escapeHtml(r.name)}</span></div>
                </article>`).join('');
        },

        portfolio() {
            return `
                <header class="page-header">
                    <div class="container">
                        <div class="page-badge"><i class="fas fa-palette" aria-hidden="true"></i> <span data-i18n="portfolio.badge">My Work</span></div>
                        <h1 class="page-title" data-i18n="portfolio.title">Creative <span class="gradient-text">Portfolio</span></h1>
                        <p class="page-subtitle" data-i18n="portfolio.subtitle">Explore my collection of UI designs for Roblox games.</p>
                    </div>
                </header>
                <section class="portfolio-section">
                    <div class="container">
                        <div class="portfolio-grid" id="portfolioGrid">
                            ${[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18].map(i => `
                                <article class="portfolio-item glass-card" data-lightbox="images/work${i}.png" data-fallback="images/work${i}.jpg" data-title="Project ${i}">
                                    <img 
                                        src="images/work${i}.png" 
                                        data-fallback="images/work${i}.jpg"
                                        alt="Portfolio work ${i}" 
                                        loading="lazy" 
                                        width="400" 
                                        height="300"
                                    >
                                    <div class="portfolio-overlay">
                                        <div class="overlay-content">
                                            <span class="zoom-icon"><i class="fas fa-search-plus"></i></span>
                                            <h3>Project ${i}</h3>
                                        </div>
                                    </div>
                                </article>`).join('')}
                        </div>
                        <div class="cta-card glass-card" style="margin-top:40px;text-align:center;padding:40px">
                            <h3 data-i18n="portfolio.likeIt">Like What You See?</h3>
                            <p data-i18n="portfolio.commission">Commission your own custom UI design today.</p>
                            <a href="https://discord.com/users/1077620522680057856" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i class="fab fa-discord" aria-hidden="true"></i> <span data-i18n="cta.joinDiscord">Join Discord</span></a>
                        </div>
                    </div>
                </section>`;
        },

        games() {
            return `
                <header class="page-header">
                    <div class="container">
                        <div class="page-badge"><i class="fas fa-gamepad" aria-hidden="true"></i> <span data-i18n="games.badge">Live Games</span></div>
                        <h1 class="page-title" data-i18n="games.title">Games I Designed <span class="gradient-text">UI For</span></h1>
                        <p class="page-subtitle"><span data-i18n="games.totalVisits">Total visits across these games:</span> <strong id="totalVisitsCount">—</strong></p>
                    </div>
                </header>
                <section class="games-section">
                    <div class="container">
                        <div class="games-grid" id="gamesGrid" aria-live="polite">
                            <div class="loading-games"><i class="fas fa-spinner fa-spin" aria-hidden="true"></i><p data-i18n="games.loading">Loading games data...</p></div>
                        </div>
                        <p class="more-note" data-i18n="games.more">...and there is more than all that</p>
                        <div class="cta-card glass-card" style="margin-top:40px;text-align:center;padding:40px">
                            <h3 data-i18n="games.wantFeatured">Want Your Game Featured?</h3>
                            <p data-i18n="games.commissionText">Commission a professional UI design and join successful Roblox games.</p>
                            <a href="https://discord.com/users/1077620522680057856" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i class="fab fa-discord" aria-hidden="true"></i> <span data-i18n="cta.joinDiscord">Join Discord</span></a>
                        </div>
                    </div>
                </section>`;
        },

        pricing() {
            return `
                <header class="page-header">
                    <div class="container">
                        <div class="page-badge"><i class="fas fa-tags" aria-hidden="true"></i> <span data-i18n="pricing.badge">Transparent Pricing</span></div>
                        <h1 class="page-title" data-i18n="pricing.title">CHOOSE YOUR <span class="gradient-text">PERFECT PLAN</span></h1>
                        <p class="page-subtitle" data-i18n="pricing.subtitle">Tailored packages to match your project's scale and style.</p>
                    </div>
                </header>
                <section class="pricing-section">
                    <div class="container">
                        <div class="pricing-grid pricing-4">
                            ${this.renderPricingCards()}
                        </div>
                    </div>
                </section>
                <section class="why-choose-section">
                    <div class="container">
                        <h2 class="section-title" data-i18n="pricing.whyChoose">Why choose me?</h2>
                        <p class="section-subtitle" data-i18n="pricing.whySubtitle">Reasons to choose my service.</p>
                        <div class="why-choose-grid">
                            <article class="why-card glass-card"><div class="why-icon"><i class="fas fa-redo" aria-hidden="true"></i></div><div><h4>Free Revisions</h4><p>Up to 5 free revisions until you are 100% satisfied</p></div></article>
                            <article class="why-card glass-card"><div class="why-icon"><i class="fas fa-comments" aria-hidden="true"></i></div><div><h4>Clear Communication</h4><p>I always keep you informed every step of the way</p></div></article>
                            <article class="why-card glass-card"><div class="why-icon"><i class="fas fa-clock" aria-hidden="true"></i></div><div><h4>Full-Time Designer</h4><p>As a full-time designer, you'll get frequent communication & instant updates</p></div></article>
                            <article class="why-card glass-card"><div class="why-icon"><i class="fas fa-shield-alt" aria-hidden="true"></i></div><div><h4>Money Back Guarantee</h4><p>MONEY back guarantee if not satisfied</p></div></article>
                        </div>
                    </div>
                </section>
                <section class="faq-section">
                    <div class="container">
                        <h2 class="section-title" data-i18n="pricing.faq">Frequently Asked Questions</h2>
                        <div class="faq-list">${this.renderFAQ()}</div>
                        <div class="faq-cta"><p data-i18n="pricing.stillQuestions">Still have questions?</p><a href="https://discord.com/users/1077620522680057856" target="_blank" rel="noopener noreferrer" class="btn btn-primary"><i class="fab fa-discord" aria-hidden="true"></i> <span data-i18n="cta.joinDiscord">Join Discord</span></a></div>
                    </div>
                </section>`;
        },

        renderPricingCards() {
            const plans = [
                { 
                    icon: 'fas fa-rocket', 
                    name: 'Basic Pack', 
                    desc: 'PerTask', 
                    price: 15, 
                    robux: '4K + Tax Robux', 
                    subtitle: 'Best for small UI tasks / mini features',
                    features: ['5 Revisions', 'No PSD Files', 'No Import included'] 
                },
                { 
                    icon: 'fas fa-crown', 
                    name: 'Full Game UI', 
                    desc: 'Any Style', 
                    price: 260, 
                    robux: '75K + Tax Robux', 
                    subtitle: 'Full game coverage / premium polish',
                    features: ['Import included', '35 Revisions', 'PSD Files Included', 'Full UI Folders + Unlimited Revisions'],
                    note: 'Includes 4 free custom UIs you can use however you want. After those 4, each new UI request is $25.',
                    featured: true 
                },
                { 
                    icon: 'fas fa-gem', 
                    name: 'Medium Pack', 
                    desc: 'PerTask', 
                    price: 25, 
                    robux: '7K + Tax Robux', 
                    subtitle: 'Great for high-appeal themed UIs',
                    features: ['Import included', '10 Revisions', 'No PSD Files'] 
                },
                { 
                    icon: 'fas fa-upload', 
                    name: 'Import per frame', 
                    desc: 'to Studio', 
                    price: 5, 
                    robux: 'per frame', 
                    subtitle: 'For importing any UI design (except Anime/Horror) to Roblox Studio',
                    features: ['Full optimization for all devices'] 
                }
            ];
            return plans.map(p => `
                <article class="pricing-card glass-card${p.featured ? ' featured' : ''}">
                    ${p.featured ? '<div class="pricing-badge">مميز</div>' : ''}
                    <div class="pricing-icon"><i class="${p.icon}" aria-hidden="true"></i></div>
                    <h3 class="pricing-name">${p.name}</h3>
                    <p class="pricing-desc">${p.desc}</p>
                    <div class="pricing-price"><span class="currency">$</span><span class="amount">${p.price}</span></div>
                    <p class="pricing-robux"><i class="fas fa-coins" aria-hidden="true"></i> ${p.robux}</p>
                    <p class="pricing-subtitle">${p.subtitle}</p>
                    <ul class="pricing-features">${p.features.map(f => `<li><i class="fas fa-check" aria-hidden="true"></i> ${f}</li>`).join('')}</ul>
                    ${p.note ? `<p class="pricing-note">${p.note}</p>` : ''}
                    <a href="https://discord.com/users/1077620522680057856" target="_blank" rel="noopener noreferrer" class="btn btn-primary btn-full"><i class="fas fa-rocket" aria-hidden="true"></i> <span data-i18n="pricing.goWith">Go with this plan</span></a>
                </article>`).join('');
        },

        renderFAQ() {
            const faqs = [
                { q: 'How long does it take to complete a UI design?', a: 'The delivery time depends on the complexity and number of frames. On average, a single frame takes 1–3 days.' },
                { q: 'Do you provide revisions?', a: 'Yes, I offer up to 5 free revisions for every project.' },
                { q: 'Can you import the designs directly into Roblox Studio?', a: 'Yes, importing is one of my services. I ensure all designs are scaled and optimized for every device.' },
                { q: 'What payment methods do you accept?', a: 'I accept PayPal and Robux. Robux prices already include Roblox tax.' },
                { q: 'What do I receive once the work is completed?', a: 'You\'ll receive organized PNGs or a direct import to your Roblox project, as you prefer.' },
                { q: 'Do you offer refunds?', a: 'Yes, I provide a money-back guarantee if you are not satisfied with the results.' },
                { q: 'Do you work full-time?', a: 'Yes, I\'m a full-time UI/UX artist with daily availability for updates and communication.' },
                { q: 'Can you take rush orders / tight deadlines?', a: 'Rush projects are possible depending on the scope and current queue. Message me to confirm availability.' }
            ];
            return faqs.map((f, i) => `
                <article class="faq-item glass-card" data-faq="${i}">
                    <button class="faq-question" aria-expanded="false" aria-controls="faq-answer-${i}"><span>${f.q}</span><i class="fas fa-chevron-down" aria-hidden="true"></i></button>
                    <div class="faq-answer" id="faq-answer-${i}" hidden><p>${f.a}</p></div>
                </article>`).join('');
        },

        reviews() {
            const reviews = ReviewsData.getAll();
            const avg = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
            return `
                <header class="page-header">
                    <div class="container">
                        <div class="page-badge"><i class="fas fa-star" aria-hidden="true"></i> <span data-i18n="reviews.badge">Client Feedback</span></div>
                        <h1 class="page-title" data-i18n="reviews.title">What Clients <span class="gradient-text">Say</span></h1>
                        <p class="page-subtitle" data-i18n="reviews.subtitle">Real feedback from real clients.</p>
                    </div>
                </header>
                <section class="reviews-section">
                    <div class="container">
                        <div class="reviews-summary glass-card">
                            <div class="summary-rating"><div class="big-rating">${avg}</div><div class="rating-stars">${'<i class="fas fa-star" aria-hidden="true"></i>'.repeat(5)}</div><p class="rating-count"><span data-i18n="reviews.based">Based on</span> ${reviews.length} <span data-i18n="reviews.reviewsText">reviews</span></p></div>
                            <div class="rating-breakdown">${[5,4,3,2,1].map(n => { const count = reviews.filter(r => r.rating === n).length; const pct = Math.round((count / reviews.length) * 100); return `<div class="breakdown-row"><span>${n} <i class="fas fa-star" aria-hidden="true"></i></span><div class="breakdown-bar"><div class="breakdown-fill" style="width:${pct}%"></div></div><span>${count}</span></div>`; }).join('')}</div>
                        </div>
                        <div class="reviews-filters" role="group" aria-label="Filter reviews"><button type="button" class="filter-btn active" data-rating="all">All</button>${[5,4,3,2,1].map(n => `<button type="button" class="filter-btn" data-rating="${n}">${n} Stars</button>`).join('')}</div>
                        <div class="reviews-grid" id="reviewsGrid" aria-live="polite"></div>
                        <div class="submit-cta glass-card"><div class="cta-icon"><i class="fas fa-pen" aria-hidden="true"></i></div><div class="cta-text"><h3 data-i18n="reviews.share">Share Your Experience</h3><p data-i18n="reviews.shareText">Worked with me? I'd love to hear your feedback!</p></div><a href="#submit-review" class="btn btn-primary" data-page="submit-review"><i class="fas fa-paper-plane" aria-hidden="true"></i> <span data-i18n="reviews.submitReview">Submit Review</span></a></div>
                    </div>
                </section>`;
        },

        policies() {
            return `
                <header class="page-header">
                    <div class="container">
                        <div class="page-badge"><i class="fas fa-shield-alt" aria-hidden="true"></i> <span data-i18n="policies.badge">Terms & Policies</span></div>
                        <h1 class="page-title">TERMS OF <span class="gradient-text">SERVICE</span></h1>
                        <p class="page-subtitle">Rules & Collaboration</p>
                    </div>
                </header>
                <section class="policies-section">
                    <div class="container">
                        <div class="terms-grid">
                            <article class="term-card glass-card"><div class="term-icon"><i class="fas fa-code" aria-hidden="true"></i></div><h3>I don't Script UIs</h3><p>Focus is on professional UI/UX design and import. Scripting or gameplay logic is not part of the service.</p></article>
                            <article class="term-card glass-card"><div class="term-icon"><i class="fas fa-file-export" aria-hidden="true"></i></div><h3>Delivery Format</h3><p>The UI is delivered as an .rbxl or .rbxm file only. Assets are organized, named clearly and scaled to work across devices for smooth import.</p></article>
                            <article class="term-card glass-card"><div class="term-icon"><i class="fas fa-ban" aria-hidden="true"></i></div><h3>No Resell Without Permission</h3><p>You don't have the right to resell UIs made by me without my permission. Personal & project use only.</p></article>
                            <article class="term-card glass-card"><div class="term-icon"><i class="fas fa-undo" aria-hidden="true"></i></div><h3>Refund Policy</h3><p>If you cancel the order, refunds aren't available. If I cancel the order, you'll be fully refunded for any Robux you paid.</p></article>
                        </div>
                        <div class="terms-extra glass-card">
                            <p><strong>Additional HUD/Frame Designs:</strong> If you ask me to create any new HUD or frame designs, I will make up to 2 new HUD designs for free. If your request needs more than 2 HUD designs, I will charge $5 or 2.5k + tax Robux for each extra HUD design. For new frame designs, I will charge $15 for every new frame design you request, and there are no free frame designs included.</p>
                        </div>
                        <p class="policies-footer">Questions? <a href="https://discord.com/users/1077620522680057856" target="_blank" rel="noopener noreferrer">Contact me on Discord</a></p>
                    </div>
                </section>`;
        },

        'submit-review'() {
            return `
                <header class="page-header">
                    <div class="container">
                        <div class="page-badge"><i class="fas fa-pen" aria-hidden="true"></i> Submit Review</div>
                        <h1 class="page-title">Share Your <span class="gradient-text">Experience</span></h1>
                        <p class="page-subtitle">Your feedback helps others make informed decisions.</p>
                    </div>
                </header>
                <section class="review-form-section">
                    <div class="container">
                        <div class="review-journey glass-card">
                            <div class="journey-progress">${[1,2,3,4,5,6].map(n => `<div class="progress-step${n===1?' active':''}" data-step="${n}"><div class="step-icon"><i class="fas fa-${['user','folder','star','comment','check','trophy'][n-1]}" aria-hidden="true"></i></div><span>${['Name','Project','Rating','Review','Preview','Done'][n-1]}</span></div>`).join('')}</div>
                            ${this.renderReviewSteps()}
                        </div>
                    </div>
                </section>`;
        },

        renderReviewSteps() {
            return `
                <div class="journey-step active" data-step="1"><div class="step-number">01</div><h2>What's your name?</h2><p>How should we identify you?</p><div class="form-group"><label for="reviewerName">Your Name / Username</label><div class="input-wrap"><i class="fas fa-user" aria-hidden="true"></i><input type="text" id="reviewerName" placeholder="e.g. CoolDeveloper123" maxlength="50" autocomplete="name"></div><span class="input-hint">This will be displayed publicly</span></div><div class="step-buttons"><button type="button" class="btn btn-primary" data-action="next">Continue <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div></div>
                <div class="journey-step" data-step="2"><div class="step-number">02</div><h2>Which project?</h2><p>What did I design for you?</p><div class="form-group"><label for="projectName">Project Name</label><div class="input-wrap"><i class="fas fa-folder" aria-hidden="true"></i><input type="text" id="projectName" placeholder="e.g. Game UI, Lobby System" maxlength="100"></div></div><div class="step-buttons"><button type="button" class="btn btn-secondary" data-action="prev"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back</button><button type="button" class="btn btn-primary" data-action="next">Continue <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div></div>
                <div class="journey-step" data-step="3"><div class="step-number">03</div><h2>Rate your experience</h2><p>How would you rate my service?</p><div class="rating-selector" role="group" aria-label="Rating selection">${[1,2,3,4,5].map(n => `<button type="button" class="rating-star" data-rating="${n}" aria-label="${n} star"><i class="far fa-star" aria-hidden="true"></i></button>`).join('')}</div><div class="rating-label" id="ratingLabel" aria-live="polite">Select a rating</div><div class="step-buttons"><button type="button" class="btn btn-secondary" data-action="prev"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back</button><button type="button" class="btn btn-primary" data-action="next">Continue <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div></div>
                <div class="journey-step" data-step="4"><div class="step-number">04</div><h2>Share your thoughts</h2><p>What was your experience like?</p><div class="form-group"><label for="reviewText">Your Review</label><textarea id="reviewText" rows="4" placeholder="Tell others about your experience..." maxlength="500"></textarea><span class="input-hint"><span id="charCount">0</span>/500 characters</span></div><div class="step-buttons"><button type="button" class="btn btn-secondary" data-action="prev"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back</button><button type="button" class="btn btn-primary" data-action="next">Preview <i class="fas fa-arrow-right" aria-hidden="true"></i></button></div></div>
                <div class="journey-step" data-step="5"><div class="step-number">05</div><h2>Preview your review</h2><p>Does everything look correct?</p><div class="review-preview glass-card" id="reviewPreview"></div><div class="step-buttons"><button type="button" class="btn btn-secondary" data-action="prev"><i class="fas fa-arrow-left" aria-hidden="true"></i> Edit</button><button type="button" class="btn btn-primary" data-action="submit"><i class="fas fa-paper-plane" aria-hidden="true"></i> Submit Review</button></div></div>
                <div class="journey-step" data-step="6"><div class="success-animation"><i class="fas fa-check" aria-hidden="true"></i></div><h2>Thank You!</h2><p>Your review has been submitted successfully.</p><div class="step-buttons"><a href="#reviews" class="btn btn-primary" data-page="reviews"><i class="fas fa-arrow-left" aria-hidden="true"></i> Back to Reviews</a></div></div>`;
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // GAMES MANAGER MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const GamesManager = {
        async init() {
            const grid = Utils.$('#gamesGrid');
            const totalEl = Utils.$('#totalVisitsCount');
            
            if (!grid) return;

            if (CONFIG.GAME_PLACE_IDS.length === 0) {
                grid.innerHTML = '<div class="no-games glass-card" style="grid-column:1/-1;text-align:center;padding:60px"><i class="fas fa-gamepad" style="font-size:3rem;color:var(--primary);margin-bottom:20px;display:block" aria-hidden="true"></i><h3>Games Coming Soon</h3></div>';
                return;
            }

            if (!Utils.rateLimiter.canMakeRequest('games')) {
                this.showError(grid);
                return;
            }

            try {
                const res = await fetch(`${CONFIG.API_ENDPOINT}?ids=${CONFIG.GAME_PLACE_IDS.join(',')}`);
                
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}`);
                }
                
                const data = await res.json();
                
                if (data.ok && Array.isArray(data.data)) {
                    this.renderGames(grid, data.data);
                    if (totalEl) {
                        totalEl.textContent = Utils.formatNumber(data.totalVisits);
                    }
                } else {
                    this.showError(grid);
                }
            } catch (err) {
                console.error('Games fetch error:', err);
                this.showError(grid);
            }
        },

        renderGames(grid, games) {
            grid.innerHTML = games.map((game, index) => {
                const name = Utils.escapeHtml(game.name) || 'Unknown Game';
                const visits = Utils.formatNumber(game.visits);
                const icon = game.icon || 'https://placehold.co/420x420/0a1628/b5c1dc?text=Game';
                const gameUrl = `https://www.roblox.com/games/${Utils.escapeHtml(game.inputId)}`;
                
                return `
                    <article class="game-card glass-card" style="animation-delay:${index * 0.1}s">
                        <div class="game-thumbnail">
                            <a href="${gameUrl}" target="_blank" rel="noopener noreferrer">
                                <img src="${Utils.escapeHtml(icon)}" 
                                     alt="${name}" 
                                     loading="lazy" 
                                     width="420" 
                                     height="420"
                                     class="game-icon-img">
                            </a>
                            <div class="game-visits">
                                <i class="fas fa-eye" aria-hidden="true"></i> 
                                <span>${visits}</span>
                            </div>
                        </div>
                        <div class="game-info">
                            <h3><i class="fas fa-gamepad" aria-hidden="true"></i> ${name}</h3>
                            <div class="game-stats">
                                <span><i class="fas fa-eye" aria-hidden="true"></i> ${visits} ${I18n.translate('games.visits')}</span>
                            </div>
                            <a href="${gameUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                                <i class="fas fa-play" aria-hidden="true"></i> 
                                <span data-i18n="games.playNow">${I18n.translate('games.playNow')}</span>
                            </a>
                        </div>
                    </article>`;
            }).join('');
            
            // CSP-safe: Attach error handlers after render
            Utils.$$('.game-icon-img').forEach(img => {
                img.addEventListener('error', function() {
                    this.src = 'https://placehold.co/420x420/0a1628/b5c1dc?text=Game';
                }, { once: true });
            });
        },

        showError(grid) {
            grid.innerHTML = '<div class="error-message glass-card" style="grid-column:1/-1;text-align:center;padding:60px"><i class="fas fa-exclamation-triangle" style="font-size:3rem;color:#ef4444;margin-bottom:20px;display:block" aria-hidden="true"></i><h3>Unable to load games</h3><p style="color:var(--text-secondary);margin-bottom:20px">Could not connect to Roblox API. This might be a temporary issue.</p><button type="button" class="btn btn-primary" id="retryGamesBtn"><i class="fas fa-redo"></i> Try Again</button></div>';
            
            // CSP-safe: Attach retry handler
            const retryBtn = Utils.$('#retryGamesBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => location.reload());
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // REVIEWS MANAGER MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const ReviewsManager = {
        init() {
            this.render('all');
            this.attachFilters();
        },

        render(filter = 'all') {
            const grid = Utils.$('#reviewsGrid');
            if (!grid) return;

            const reviews = ReviewsData.getAll();
            const filtered = filter === 'all' 
                ? reviews 
                : reviews.filter(r => r.rating === parseInt(filter, 10));

            grid.innerHTML = filtered.map(r => `
                <article class="review-card glass-card">
                    <div class="review-header">
                        <div class="reviewer-avatar"><i class="fas fa-user-astronaut" aria-hidden="true"></i></div>
                        <div class="reviewer-info">
                            <h4>${Utils.escapeHtml(r.name)}</h4>
                            <span class="review-project">${Utils.escapeHtml(r.project)}</span>
                        </div>
                        ${r.verified ? '<div class="verified-badge"><i class="fas fa-check-circle" aria-hidden="true"></i> Verified</div>' : ''}
                    </div>
                    <div class="review-rating" aria-label="${r.rating} stars">
                        ${'<i class="fas fa-star" aria-hidden="true"></i>'.repeat(r.rating)}
                        ${'<i class="far fa-star" aria-hidden="true"></i>'.repeat(5 - r.rating)}
                    </div>
                    <p class="review-text">"${Utils.escapeHtml(r.text)}"</p>
                    <div class="review-date"><i class="fas fa-calendar" aria-hidden="true"></i> ${r.date}</div>
                </article>
            `).join('');
        },

        attachFilters() {
            Utils.$$('.reviews-filters .filter-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    Utils.$$('.reviews-filters .filter-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.render(btn.dataset.rating);
                });
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // REVIEW FORM MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const ReviewForm = {
        currentStep: 1,
        data: { name: '', project: '', rating: 0, text: '' },

        init() {
            this.currentStep = 1;
            this.data = { name: '', project: '', rating: 0, text: '' };
            this.attachEventListeners();
        },

        attachEventListeners() {
            // Rating stars
            Utils.$$('.rating-star').forEach(star => {
                star.addEventListener('click', () => {
                    this.data.rating = parseInt(star.dataset.rating, 10);
                    Utils.$$('.rating-star').forEach((s, i) => {
                        const icon = s.querySelector('i');
                        if (icon) {
                            icon.className = i < this.data.rating ? 'fas fa-star' : 'far fa-star';
                        }
                    });
                    const label = Utils.$('#ratingLabel');
                    if (label) {
                        label.textContent = ['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][this.data.rating];
                    }
                });
            });

            // Character count
            const textarea = Utils.$('#reviewText');
            const charCount = Utils.$('#charCount');
            if (textarea && charCount) {
                textarea.addEventListener('input', () => {
                    charCount.textContent = textarea.value.length;
                });
            }

            // Navigation buttons
            Utils.$$('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const action = btn.dataset.action;
                    if (action === 'next') this.nextStep();
                    else if (action === 'prev') this.prevStep();
                    else if (action === 'submit') this.submit();
                });
            });
        },

        nextStep() {
            if (!this.validateStep()) return;
            this.saveStepData();
            this.currentStep++;
            if (this.currentStep === 5) this.showPreview();
            this.updateUI();
        },

        prevStep() {
            this.currentStep--;
            this.updateUI();
        },

        validateStep() {
            switch (this.currentStep) {
                case 1:
                    const name = Utils.$('#reviewerName');
                    return name && name.value.trim().length >= 2;
                case 2:
                    const project = Utils.$('#projectName');
                    return project && project.value.trim().length >= 2;
                case 3:
                    return this.data.rating > 0;
                case 4:
                    const text = Utils.$('#reviewText');
                    return text && text.value.trim().length >= 10;
                default:
                    return true;
            }
        },

        saveStepData() {
            switch (this.currentStep) {
                case 1:
                    const name = Utils.$('#reviewerName');
                    if (name) this.data.name = Utils.sanitizeInput(name.value);
                    break;
                case 2:
                    const project = Utils.$('#projectName');
                    if (project) this.data.project = Utils.sanitizeInput(project.value);
                    break;
                case 4:
                    const text = Utils.$('#reviewText');
                    if (text) this.data.text = Utils.sanitizeInput(text.value);
                    break;
            }
        },

        showPreview() {
            const preview = Utils.$('#reviewPreview');
            if (preview) {
                preview.innerHTML = `
                    <div class="preview-header">
                        <strong>${Utils.escapeHtml(this.data.name)}</strong> • ${Utils.escapeHtml(this.data.project)}
                    </div>
                    <div class="preview-rating">${'<i class="fas fa-star" aria-hidden="true"></i>'.repeat(this.data.rating)}</div>
                    <p>"${Utils.escapeHtml(this.data.text)}"</p>`;
            }
        },

        updateUI() {
            Utils.$$('.journey-step').forEach(step => {
                step.classList.toggle('active', parseInt(step.dataset.step, 10) === this.currentStep);
            });
            Utils.$$('.progress-step').forEach(step => {
                const n = parseInt(step.dataset.step, 10);
                step.classList.toggle('active', n === this.currentStep);
                step.classList.toggle('completed', n < this.currentStep);
            });
        },

        submit() {
            const newReview = {
                ...this.data,
                date: new Date().toISOString().slice(0, 7),
                verified: false
            };
            ReviewsData.add(newReview);
            this.currentStep = 6;
            this.updateUI();
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // ROUTER MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const Router = {
        currentPage: 'home',

        init() {
            const hash = window.location.hash.slice(1) || 'home';
            this.navigate(hash, false);
            
            window.addEventListener('hashchange', () => {
                this.navigate(window.location.hash.slice(1) || 'home', false);
            });

            document.addEventListener('click', e => {
                const link = e.target.closest('[data-page]');
                if (link) {
                    e.preventDefault();
                    this.navigate(link.dataset.page);
                }
            });
        },

        navigate(page, updateHash = true) {
            if (!Templates[page]) {
                page = 'home';
            }

            this.currentPage = page;
            
            if (updateHash) {
                window.location.hash = page;
            }

            // Update active states
            Utils.$$('.nav-link, .mobile-nav-link').forEach(link => {
                link.classList.toggle('active', link.dataset.page === page);
            });

            // Render content
            const main = Utils.$('#mainContent');
            if (main) {
                main.style.opacity = '0';
                setTimeout(() => {
                    main.innerHTML = Templates[page]();
                    main.style.opacity = '1';
                    this.initPageFeatures(page);
                    I18n.translatePage();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }, 150);
            }
        },

        initPageFeatures(page) {
            switch (page) {
                case 'games':
                    GamesManager.init();
                    break;
                case 'portfolio':
                    Lightbox.init();
                    break;
                case 'reviews':
                    ReviewsManager.init();
                    break;
                case 'submit-review':
                    ReviewForm.init();
                    break;
                case 'pricing':
                    FAQManager.init();
                    break;
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // FAQ MANAGER MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const FAQManager = {
        init() {
            Utils.$$('.faq-question').forEach(btn => {
                btn.addEventListener('click', () => {
                    const item = btn.closest('.faq-item');
                    const answer = item.querySelector('.faq-answer');
                    const isOpen = btn.getAttribute('aria-expanded') === 'true';
                    
                    // Close all others
                    Utils.$$('.faq-item').forEach(otherItem => {
                        otherItem.classList.remove('active');
                        const otherBtn = otherItem.querySelector('.faq-question');
                        const otherAnswer = otherItem.querySelector('.faq-answer');
                        if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
                        if (otherAnswer) otherAnswer.hidden = true;
                    });
                    
                    // Toggle current
                    if (!isOpen) {
                        item.classList.add('active');
                        btn.setAttribute('aria-expanded', 'true');
                        if (answer) answer.hidden = false;
                    }
                });
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // IMAGE ERROR HANDLER (CSP-Safe - No Inline Handlers)
    // ═══════════════════════════════════════════════════════════════
    
    const ImageErrorHandler = {
        placeholderUrl: 'https://placehold.co/400x300/0a1628/8b5cf6?text=Image+Not+Found',
        
        init() {
            // Handle portfolio images
            Utils.$$('#portfolioGrid img[data-fallback]').forEach(img => {
                img.addEventListener('error', () => this.handleError(img));
            });
            
            // Handle game card images  
            Utils.$$('.game-card img').forEach(img => {
                img.addEventListener('error', () => {
                    img.src = 'https://placehold.co/420x420/0a1628/b5c1dc?text=Game';
                });
            });
        },
        
        handleError(img) {
            const fallback = img.getAttribute('data-fallback');
            const currentSrc = img.src;
            
            // Try fallback first
            if (fallback && !currentSrc.includes(fallback)) {
                img.src = fallback;
                // Update parent's lightbox attribute
                const parent = img.closest('[data-lightbox]');
                if (parent) {
                    parent.setAttribute('data-lightbox', fallback);
                }
            } else {
                // Use placeholder if fallback also fails
                img.src = this.placeholderUrl;
                const parent = img.closest('[data-lightbox]');
                if (parent) {
                    parent.setAttribute('data-lightbox', this.placeholderUrl);
                }
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // LIGHTBOX MODULE (Portfolio Image Viewer)
    // ═══════════════════════════════════════════════════════════════
    
    const Lightbox = {
        overlay: null,
        
        init() {
            // Initialize image error handling first (CSP-safe)
            ImageErrorHandler.init();
            
            // Create lightbox if not exists
            if (!Utils.$('#lightboxOverlay')) {
                this.createLightbox();
            }
            
            this.overlay = Utils.$('#lightboxOverlay');
            
            // Attach click events to portfolio items
            Utils.$$('[data-lightbox]').forEach(item => {
                item.style.cursor = 'pointer';
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const imgSrc = item.getAttribute('data-lightbox');
                    const title = item.getAttribute('data-title') || '';
                    this.open(imgSrc, title);
                });
            });
        },
        
        createLightbox() {
            const lightboxHTML = `
                <div class="lightbox-overlay" id="lightboxOverlay">
                    <div class="lightbox-content">
                        <button class="lightbox-close" id="lightboxClose" aria-label="Close lightbox">
                            <i class="fas fa-times"></i>
                        </button>
                        <img src="" alt="" class="lightbox-image" id="lightboxImage">
                        <div class="lightbox-title" id="lightboxTitle"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', lightboxHTML);
            
            // Attach close events
            const overlay = Utils.$('#lightboxOverlay');
            const closeBtn = Utils.$('#lightboxClose');
            
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }
            
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.close();
                });
            }
            
            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && this.overlay && this.overlay.classList.contains('active')) {
                    this.close();
                }
            });
        },
        
        open(src, title) {
            const img = Utils.$('#lightboxImage');
            const titleEl = Utils.$('#lightboxTitle');
            
            if (img) img.src = src;
            if (titleEl) titleEl.textContent = title;
            
            if (this.overlay) {
                this.overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
            }
        },
        
        close() {
            if (this.overlay) {
                this.overlay.classList.remove('active');
                document.body.style.overflow = '';
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // AUDIO MODULE (Autoplay on page load)
    // ═══════════════════════════════════════════════════════════════
    
    const AudioPlayer = {
        audio: null,
        isPlaying: false,
        audioAvailable: true,

        init() {
            this.audio = Utils.$('#bgMusic');
            if (!this.audio) return;

            // Handle missing audio file gracefully
            this.audio.addEventListener('error', () => {
                this.audioAvailable = false;
                this.disableMusicFeature();
            });

            const prefs = this.getPrefs();
            this.audio.volume = prefs.volume / 100;

            // Update volume slider
            const slider = Utils.$('#volumeSlider');
            const valueEl = Utils.$('#volumeValue');
            if (slider) slider.value = prefs.volume;
            if (valueEl) valueEl.textContent = prefs.volume + '%';

            // Attach event listener to music button
            const musicBtn = Utils.$('#musicToggleBtn');
            if (musicBtn) {
                musicBtn.addEventListener('click', () => this.toggle());
            }

            // Volume slider
            if (slider) {
                slider.addEventListener('input', (e) => this.setVolume(e.target.value));
            }

            // AUTOPLAY - Try to play music when page loads
            this.autoPlay();
        },
        
        disableMusicFeature() {
            const musicBtn = Utils.$('#musicToggleBtn');
            if (musicBtn) {
                musicBtn.style.opacity = '0.5';
                musicBtn.style.cursor = 'not-allowed';
                musicBtn.title = 'Music file not available';
                const icon = musicBtn.querySelector('i');
                if (icon) icon.className = 'fas fa-volume-mute';
            }
        },

        autoPlay() {
            if (!this.audio || !this.audioAvailable) return;
            
            const prefs = this.getPrefs();
            
            // If user explicitly disabled music, don't autoplay
            if (prefs.userDisabled === true) {
                this.updateButton();
                return;
            }
            
            // Try to play
            this.audio.play()
                .then(() => {
                    this.isPlaying = true;
                    this.updateButton();
                })
                .catch(() => {
                    // Browser blocked autoplay, wait for user interaction
                    const playOnInteraction = () => {
                        if (this.getPrefs().userDisabled !== true) {
                            this.audio.play()
                                .then(() => {
                                    this.isPlaying = true;
                                    this.updateButton();
                                })
                                .catch(() => {});
                        }
                        document.removeEventListener('click', playOnInteraction);
                        document.removeEventListener('touchstart', playOnInteraction);
                    };
                    document.addEventListener('click', playOnInteraction, { once: true });
                    document.addEventListener('touchstart', playOnInteraction, { once: true });
                    this.updateButton();
                });
        },

        getPrefs() {
            return Utils.storage.get(CONFIG.STORAGE_KEYS.MUSIC, { 
                userDisabled: false, 
                volume: CONFIG.DEFAULT_VOLUME 
            });
        },

        savePrefs(prefs) {
            const current = this.getPrefs();
            Utils.storage.set(CONFIG.STORAGE_KEYS.MUSIC, { ...current, ...prefs });
        },

        toggle() {
            if (!this.audio || !this.audioAvailable) return;

            if (this.isPlaying) {
                this.audio.pause();
                this.isPlaying = false;
                this.savePrefs({ userDisabled: true });
            } else {
                this.audio.play()
                    .then(() => {
                        this.isPlaying = true;
                        this.savePrefs({ userDisabled: false });
                    })
                    .catch(err => {
                        console.warn('Audio play failed:', err);
                    });
            }
            this.updateButton();
        },

        setVolume(value) {
            if (!this.audio) return;
            const vol = Math.max(0, Math.min(100, parseInt(value, 10) || CONFIG.DEFAULT_VOLUME));
            this.audio.volume = vol / 100;
            this.savePrefs({ volume: vol });
            
            const valueEl = Utils.$('#volumeValue');
            if (valueEl) valueEl.textContent = vol + '%';
        },

        updateButton() {
            const btn = Utils.$('#musicToggleBtn');
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    // Music icon when playing, play icon when paused
                    icon.className = this.isPlaying ? 'fas fa-music' : 'fas fa-play';
                }
                btn.setAttribute('aria-pressed', this.isPlaying);
                btn.setAttribute('aria-label', this.isPlaying ? 'Pause music' : 'Play music');
                btn.title = this.isPlaying ? 'Pause Music' : 'Play Music';
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // SITE SETTINGS MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const SiteSettings = {
        init() {
            const prefs = this.getPrefs();

            if (prefs.animationsDisabled) {
                document.body.classList.add('no-animations');
            }
            if (prefs.highQuality) {
                document.body.classList.add('high-quality');
            }

            const animToggle = Utils.$('#animationsToggle');
            const qualityToggle = Utils.$('#qualityToggle');

            if (animToggle) {
                animToggle.checked = !prefs.animationsDisabled;
                animToggle.addEventListener('change', () => this.toggleAnimations(animToggle.checked));
            }
            if (qualityToggle) {
                qualityToggle.checked = prefs.highQuality;
                qualityToggle.addEventListener('change', () => this.toggleQuality(qualityToggle.checked));
            }
        },

        getPrefs() {
            return Utils.storage.get(CONFIG.STORAGE_KEYS.SETTINGS, { 
                animationsDisabled: false, 
                highQuality: false 
            });
        },

        savePrefs(prefs) {
            const current = this.getPrefs();
            Utils.storage.set(CONFIG.STORAGE_KEYS.SETTINGS, { ...current, ...prefs });
        },

        toggleAnimations(enabled) {
            document.body.classList.toggle('no-animations', !enabled);
            this.savePrefs({ animationsDisabled: !enabled });
        },

        toggleQuality(high) {
            document.body.classList.toggle('high-quality', high);
            this.savePrefs({ highQuality: high });
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // GALAXY BACKGROUND MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const GalaxyBackground = {
        shootingStarInterval: null,

        init() {
            this.createFloatingParticles();
            this.startShootingStars();
        },

        startShootingStars() {
            const container = Utils.$('#shootingStars');
            if (!container) return;

            this.shootingStarInterval = setInterval(() => {
                // Check if animations are disabled
                if (document.body.classList.contains('no-animations')) return;

                const star = document.createElement('div');
                star.className = 'shooting-star';
                star.style.left = Math.random() * 100 + '%';
                star.style.top = Math.random() * 50 + '%';
                star.style.animationDuration = (2 + Math.random() * 2) + 's';
                container.appendChild(star);

                setTimeout(() => star.remove(), 4000);
            }, 3000);
        },

        createFloatingParticles() {
            const container = Utils.$('.galaxy-bg');
            if (!container) return;

            for (let i = 0; i < 30; i++) {
                const particle = document.createElement('div');
                particle.className = 'floating-particle';
                particle.style.left = Math.random() * 100 + '%';
                particle.style.top = Math.random() * 100 + '%';
                particle.style.animationDelay = Math.random() * 10 + 's';
                particle.style.animationDuration = (15 + Math.random() * 20) + 's';
                container.appendChild(particle);
            }
        },

        destroy() {
            if (this.shootingStarInterval) {
                clearInterval(this.shootingStarInterval);
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // MOBILE MENU MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const MobileMenu = {
        init() {
            const toggle = Utils.$('#mobileMenuToggle');
            const overlay = Utils.$('#mobileOverlay');
            const menu = Utils.$('#mobileMenu');

            if (toggle) {
                toggle.addEventListener('click', () => this.toggle());
            }
            if (overlay) {
                overlay.addEventListener('click', () => this.close());
            }

            // Close menu when navigation link is clicked
            Utils.$$('.mobile-menu [data-page]').forEach(link => {
                link.addEventListener('click', () => this.close());
            });
        },

        toggle() {
            const isOpen = document.body.classList.toggle('mobile-menu-open');
            const toggle = Utils.$('#mobileMenuToggle');
            const menu = Utils.$('#mobileMenu');
            
            if (toggle) toggle.setAttribute('aria-expanded', isOpen);
            if (menu) menu.hidden = !isOpen;
        },

        close() {
            document.body.classList.remove('mobile-menu-open');
            const toggle = Utils.$('#mobileMenuToggle');
            const menu = Utils.$('#mobileMenu');
            
            if (toggle) toggle.setAttribute('aria-expanded', 'false');
            if (menu) menu.hidden = true;
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // LANGUAGE SWITCHER MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const LanguageSwitcher = {
        init() {
            Utils.$$('.lang-btn, .mobile-lang-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    I18n.setLanguage(btn.dataset.lang);
                    Router.navigate(Router.currentPage, false);
                });
            });
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // SETTINGS MODAL MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const SettingsModal = {
        init() {
            const openBtn = Utils.$('#settingsOpenBtn');
            const closeBtn = Utils.$('#settingsCloseBtn');
            const overlay = Utils.$('#settingsOverlay');

            if (openBtn) {
                openBtn.addEventListener('click', () => this.open());
            }
            if (closeBtn) {
                closeBtn.addEventListener('click', () => this.close());
            }
            if (overlay) {
                overlay.addEventListener('click', (e) => {
                    if (e.target === overlay) this.close();
                });
            }

            // Close on Escape key
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') this.close();
            });
        },

        open() {
            const overlay = Utils.$('#settingsOverlay');
            if (overlay) {
                overlay.hidden = false;
                overlay.classList.add('active');
                document.body.style.overflow = 'hidden';
                
                // Focus trap
                const firstFocusable = overlay.querySelector('button, input');
                if (firstFocusable) firstFocusable.focus();
            }
        },

        close() {
            const overlay = Utils.$('#settingsOverlay');
            if (overlay) {
                overlay.classList.remove('active');
                document.body.style.overflow = '';
                setTimeout(() => { overlay.hidden = true; }, 300);
                
                // Return focus
                const openBtn = Utils.$('#settingsOpenBtn');
                if (openBtn) openBtn.focus();
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // WELCOME FRAME MODULE
    // ═══════════════════════════════════════════════════════════════
    
    const WelcomeFrame = {
        init() {
            const shown = Utils.storage.get(CONFIG.STORAGE_KEYS.WELCOME, false);
            if (!shown) {
                // Welcome frame could be implemented here
                Utils.storage.set(CONFIG.STORAGE_KEYS.WELCOME, true);
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // LOGO ERROR HANDLER
    // ═══════════════════════════════════════════════════════════════
    
    const LogoHandler = {
        init() {
            const logo = Utils.$('.logo-avatar');
            if (logo) {
                logo.addEventListener('error', () => {
                    logo.style.display = 'none';
                });
            }
        }
    };

    // ═══════════════════════════════════════════════════════════════
    // MAIN INITIALIZATION
    // ═══════════════════════════════════════════════════════════════
    
    function init() {
        // Initialize all modules
        I18n.init();
        TimeDisplay.init();
        Router.init();
        MobileMenu.init();
        LanguageSwitcher.init();
        SettingsModal.init();
        SiteSettings.init();
        AudioPlayer.init();
        GalaxyBackground.init();
        LogoHandler.init();

        // Hide loader after delay
        setTimeout(() => {
            const loader = Utils.$('#pageLoader');
            if (loader) {
                loader.classList.add('hidden');
                setTimeout(() => {
                    loader.style.display = 'none';
                }, 300);
            }
            
            // Initialize welcome frame
            setTimeout(() => WelcomeFrame.init(), 300);
        }, CONFIG.LOADER_DELAY);
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
