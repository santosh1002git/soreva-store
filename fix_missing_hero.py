import re
with open('app.js', 'r', encoding='utf-8') as f:
    js = f.read()

hero_code = '''
let currentHeroIndex = 0;
let heroAutoSlideInterval = null;
let heroListenersBound = false;

function initPatreonHero() {
    const heroSection = document.getElementById('homeHero');
    const slidesWrapper = document.getElementById('heroSlidesWrapper');
    const prevArrow = document.getElementById('heroArrowPrev');
    const nextArrow = document.getElementById('heroArrowNext');
    const quickViewBtn = document.getElementById('heroQuickViewBtn');
    const dotsNav = document.getElementById('heroDotsNav');

    if (!heroSection || !slidesWrapper) return;

    // 1. Render all 8 full-bleed background slide images for instant crossfading
    slidesWrapper.innerHTML = HERO_SLIDES.map((slide, idx) => `
        <div class="hero-slide-item ${idx === 0 ? 'active' : ''}" data-index="${idx}">
            <img class="hero-slide-bg" src="${slide.image}" alt="${slide.name}" loading="eager">
        </div>
    `).join('');

    // 2. Render Clickable Navigation Dots
    if (dotsNav) {
        dotsNav.innerHTML = HERO_SLIDES.map((_, idx) => `
            <button class="hero-dot ${idx === 0 ? 'active' : ''}" data-slide="${idx}" aria-label="Go to slide ${idx + 1}" title="Slide ${idx + 1}"></button>
        `).join('');

        dotsNav.querySelectorAll('.hero-dot').forEach(dot => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                const targetIdx = parseInt(dot.dataset.slide, 10);
                resetHeroAutoSlide();
                changeHeroSlide(targetIdx);
            });
        });
    }

    updateHeroUI();

    // 3. Navigation Arrows (Front & Back Buttons)
    const handlePrev = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        resetHeroAutoSlide();
        changeHeroSlide(currentHeroIndex - 1);
    };

    const handleNext = (e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        resetHeroAutoSlide();
        changeHeroSlide(currentHeroIndex + 1);
    };

    if (prevArrow) {
        prevArrow.onclick = handlePrev;
        prevArrow.addEventListener('touchend', (e) => {
            e.preventDefault();
            handlePrev(e);
        });
    }

    if (nextArrow) {
        nextArrow.onclick = handleNext;
        nextArrow.addEventListener('touchend', (e) => {
            e.preventDefault();
            handleNext(e);
        });
    }

    if (!heroListenersBound) {
        // Keyboard Arrow Navigation
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') {
                handlePrev();
            } else if (e.key === 'ArrowRight') {
                handleNext();
            }
        });

        // Pause on hover
        heroSection.addEventListener('mouseenter', () => {
            clearInterval(heroAutoSlideInterval);
        });

        heroSection.addEventListener('mouseleave', () => {
            startHeroAutoSlide();
        });
        
        heroListenersBound = true;
    }

    // 4. Quick View button for current piece
    if (quickViewBtn) {
        // Remove existing listeners by cloning
        const newBtn = quickViewBtn.cloneNode(true);
        quickViewBtn.parentNode.replaceChild(newBtn, quickViewBtn);
        newBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const currentSlide = HERO_SLIDES[currentHeroIndex];
            openQuickView(currentSlide.productId);
        });
    }

    // 5. Smooth Automatic Slide Cycling (every 6 seconds)
    startHeroAutoSlide();
}

function startHeroAutoSlide() {
    clearInterval(heroAutoSlideInterval);
    heroAutoSlideInterval = setInterval(() => {
        changeHeroSlide(currentHeroIndex + 1);
    }, 6000);
}

function resetHeroAutoSlide() {
    startHeroAutoSlide();
}

function changeHeroSlide(newIndex) {
    if (newIndex < 0) {
        newIndex = HERO_SLIDES.length - 1;
    }
    currentHeroIndex = newIndex % HERO_SLIDES.length;

    // Crossfade background slides
    const slideItems = document.querySelectorAll('.hero-slide-item');
    slideItems.forEach((slideEl, idx) => {
        slideEl.classList.toggle('active', idx === currentHeroIndex);
    });

    // Update Dots
    const dots = document.querySelectorAll('.hero-dot');
    dots.forEach((dot, idx) => {
        dot.classList.toggle('active', idx === currentHeroIndex);
    });

    updateHeroUI();
}

function updateHeroUI() {
    const slide = HERO_SLIDES[currentHeroIndex];
    if (!slide) return;

    const tagEl = document.getElementById('heroSlideTag');
    const headlineEl = document.getElementById('heroHeadline');
    const subtitleEl = document.getElementById('heroSubtitle');
    const activeNameEl = document.getElementById('heroActiveName');
    const activePriceEl = document.getElementById('heroActivePrice');
    const counterEl = document.getElementById('heroSlideCounter');

    if (tagEl) tagEl.textContent = slide.tag;
    if (headlineEl) headlineEl.innerHTML = slide.headline;
    if (subtitleEl) subtitleEl.textContent = slide.subtitle;
    if (counterEl) counterEl.textContent = `0${currentHeroIndex + 1} / 0${HERO_SLIDES.length}`;

    if (activeNameEl) activeNameEl.textContent = slide.name;
    if (activePriceEl) activePriceEl.textContent = `${formatPrice(slide.priceINR)} • ${slide.finish}`;
}
'''

if 'function initPatreonHero' not in js:
    with open('app.js', 'w', encoding='utf-8') as f:
        f.write(js + '\n' + hero_code)
