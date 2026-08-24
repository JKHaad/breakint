(function () {
    "use strict";

    const hasGSAP = typeof window.gsap !== 'undefined';
    const hasScrollTrigger = hasGSAP && typeof window.ScrollTrigger !== 'undefined';
    const hasLenis = typeof window.Lenis !== 'undefined';

    const preloader = document.getElementById('preloader');
    const headerEl = document.querySelector('header');

    // --- Always-safe: give the fixed header a solid backdrop once scrolled
    // past the very top, so it never blend-mode-collides with large headings
    // further down the page. Passive + rAF-throttled to stay cheap on scroll. ---
    if (headerEl) {
        let scrollTicking = false;
        function updateHeaderScrolled() {
            headerEl.classList.toggle('header-scrolled', window.scrollY > 40);
            scrollTicking = false;
        }
        window.addEventListener('scroll', () => {
            if (!scrollTicking) {
                requestAnimationFrame(updateHeaderScrolled);
                scrollTicking = true;
            }
        }, { passive: true });
        updateHeaderScrolled(); // set correct state on load (e.g. anchor-linked reload mid-page)
    }
    const cursorDot = document.querySelector('.cursor-dot');
    const cursorCircle = document.querySelector('.cursor-circle');

    // --- Always-safe: hide preloader (works with or without external libs) ---
    function hidePreloader() {
        if (preloader && !preloader.classList.contains('hide')) {
            preloader.classList.add('hide');
        }
    }
    if (preloader) {
        setTimeout(hidePreloader, 2200);
    }
    // Hard failsafe: no matter what else goes wrong above, never let the
    // preloader block the page for more than 6s.
    setTimeout(hidePreloader, 6000);

    // --- Always-safe: reveal fallback if animation libs never load ---
    function revealEverythingNow() {
        document.querySelectorAll('.reveal, .service-card, .process-item, .stat-item, .footer-col a').forEach(el => {
            el.style.opacity = '1';
            el.style.transform = 'none';
        });
        document.querySelectorAll('.hero .line-inner').forEach(el => { el.style.transform = 'translateY(0%)'; });
        document.querySelectorAll('.hero-meta, .hero-footer').forEach(el => { el.style.opacity = '1'; });
    }

    // --- Always-safe: contact form ---
    // Posts to the backend (see /server) which relays the message via SMTP to
    // info@breakint.com. Falls back to opening a pre-filled email if the
    // backend isn't deployed/reachable yet, so the form never dead-ends.
    // Auto-detects local development (localhost/127.0.0.1, e.g. VS Code Live
    // Server on port 5500) and points straight at the local backend on 3001.
    // In production it falls back to a relative path, which works as long as
    // the backend is deployed on the exact same domain as this site.
    // ⚠️ If you deploy the backend to its own domain (e.g. Render), replace
    // the production branch below with that full URL, e.g.:
    //   'https://your-backend.onrender.com/api/contact'
    const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    const CONTACT_API_URL = isLocalDev
        ? 'http://localhost:3001/api/contact'
        : '/api/contact';
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        const submitBtn = contactForm.querySelector('.submit-btn');
        const submitBtnText = document.getElementById('submitBtnText');

        // --- Phone country-code selector ---
        // Adds a flag/dial-code dropdown to the phone field so we always know
        // which country a submission came from. Falls back gracefully to a
        // plain text field if the library fails to load (e.g. offline).
        const phoneInputEl = document.getElementById('cf-phone');
        let phoneIti = null;
        if (phoneInputEl && window.intlTelInput) {
            phoneIti = window.intlTelInput(phoneInputEl, {
                initialCountry: 'auto',
                geoIpLookup(callback) {
                    fetch('https://ipapi.co/json')
                        .then(res => res.json())
                        .then(data => callback((data && data.country_code) || 'pk'))
                        .catch(() => callback('pk'));
                },
                preferredCountries: ['pk', 'us', 'gb', 'ae'],
                separateDialCode: true,
                utilsScript: 'https://cdn.jsdelivr.net/npm/intl-tel-input@18.2.1/build/js/utils.js',
            });
        }

        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('cf-name').value.trim();
            const email = document.getElementById('cf-email').value.trim();
            const subject = document.getElementById('cf-subject').value.trim();
            const message = document.getElementById('cf-message').value.trim();
            const note = document.getElementById('contactFormNote');

            // Full international number (e.g. +923332332243) when the country
            // selector loaded; otherwise fall back to whatever was typed.
            let phone = phoneIti ? phoneIti.getNumber() : phoneInputEl.value.trim();
            if (phoneIti && phoneInputEl.value.trim() && !phoneIti.isValidNumber()) {
                if (note) { note.style.color = '#ff6b6b'; note.textContent = 'Please enter a valid phone number for the selected country.'; }
                return;
            }
            if (!phone) {
                if (note) { note.style.color = '#ff6b6b'; note.textContent = 'Please enter your phone number.'; }
                return;
            }

            if (submitBtn) submitBtn.disabled = true;
            if (submitBtnText) submitBtnText.textContent = 'Sending...';
            if (note) { note.textContent = ''; note.style.color = '#a0a0a0'; }

            function fallbackToMailto() {
                const body = `Name: ${name}\nPhone: ${phone}\nEmail: ${email}\n\n${message}`;
                window.location.href = `mailto:info@breakint.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                if (note) note.textContent = 'Opening your email app with this message pre-filled — hit send there to reach us.';
            }

            try {
                const res = await fetch(CONTACT_API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, phone, email, subject, message })
                });
                if (!res.ok) throw new Error('Backend responded with an error');
                if (note) { note.style.color = '#4caf50'; note.textContent = "Thanks! Your message is on its way — we'll get back to you shortly."; }
                contactForm.reset();
            } catch (err) {
                // Backend not deployed yet, or unreachable — don't leave the visitor stuck.
                fallbackToMailto();
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitBtnText) submitBtnText.textContent = 'Send Message';
            }
        });
    }

    // --- Always-safe: dark mode toggle (persisted via localStorage) ---
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
            if (isDark) {
                document.documentElement.removeAttribute('data-theme');
                try { localStorage.setItem('breakint-theme', 'light'); } catch (e) {}
            } else {
                document.documentElement.setAttribute('data-theme', 'dark');
                try { localStorage.setItem('breakint-theme', 'dark'); } catch (e) {}
            }
            themeToggle.classList.remove('is-switching');
            // eslint-disable-next-line no-unused-expressions
            void themeToggle.offsetWidth; // restart animation if clicked rapidly
            themeToggle.classList.add('is-switching');
        });
    }

    // --- Always-safe: mobile menu (no animation library dependency) ---
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    if (menuToggle && navLinks) {
        menuToggle.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('active');
            document.body.classList.toggle('nav-open', isOpen);
            menuToggle.textContent = isOpen ? 'Close' : 'Menu';
        });
        // Close the mobile menu after tapping a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                document.body.classList.remove('nav-open');
                menuToggle.textContent = 'Menu';
            });
        });
    }

    // --- Custom cursor (only enabled if GSAP is available; otherwise the
    // dot/circle elements are removed so a "ghost" cursor never gets stuck
    // in the top-left corner) ---
    const wantsCustomCursor = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (wantsCustomCursor && hasGSAP && cursorDot && cursorCircle) {
        document.body.classList.add('custom-cursor');
        window.addEventListener('mousemove', (e) => {
            cursorDot.style.left = e.clientX + 'px';
            cursorDot.style.top = e.clientY + 'px';
            gsap.to(cursorCircle, { duration: 0.3, left: e.clientX, top: e.clientY });
        });
        document.querySelectorAll('a, button, .work-panel, .stack-card, .team-card').forEach(el => {
            el.addEventListener('mouseenter', () => {
                cursorCircle.classList.add('hover');
                const text = (el.classList.contains('work-panel') || el.classList.contains('stack-card') || el.classList.contains('team-card')) ? 'VIEW' : 'CLICK';
                cursorCircle.querySelector('.cursor-text').textContent = text;
            });
            el.addEventListener('mouseleave', () => cursorCircle.classList.remove('hover'));
        });
    } else if (cursorDot && cursorCircle) {
        cursorDot.remove();
        cursorCircle.remove();
    }

    // --- Everything below here needs GSAP + ScrollTrigger. Degrade gracefully
    // if either failed to load (e.g. CDN blocked in a sandboxed preview). ---
    if (!hasGSAP || !hasScrollTrigger) {
        console.warn('Breakint: GSAP/ScrollTrigger did not load — showing static fallback.');
        if (preloader) hidePreloader();
        revealEverythingNow();
        return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // --- Lenis Smooth Scroll (optional — page still works without it) ---
    if (hasLenis) {
        const lenis = new Lenis({ duration: 1.2, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add((time) => { lenis.raf(time * 1000); });
        gsap.ticker.lagSmoothing(0);
    }

    // --- Initial Hidden States (Prevents FOUC and allows clearProps to work safely) ---
    gsap.set('.hero .line-inner', { y: '110%' });
    gsap.set('.hero-meta, .hero-footer', { opacity: 0 });
    gsap.set('.reveal', { opacity: 0, y: 40 });
    gsap.set('.service-card', { opacity: 0 });

    if (preloader) {
        setTimeout(() => { revealOnLoad(); }, 2200);
    } else {
        revealOnLoad();
    }

    // --- Animations ---
    function revealOnLoad() {
        if (document.querySelector('.hero .line-inner')) {
            const heroTl = gsap.timeline();
            heroTl.to('.hero .line-inner', { y: '0%', duration: 1.2, stagger: 0.15, ease: 'power4.out' })
                  .to('.hero-meta', { opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.8')
                  .to('.hero-footer', { opacity: 1, duration: 0.8, ease: 'power3.out' }, '-=0.6');
        }
        initScrollAnimations();
        initMicroAnimations();
    }

    function initScrollAnimations() {
        // 2. Service Cards — alternate slide in from left/right as each row scrolls into view
        gsap.utils.toArray('.services-grid').forEach(grid => {
            const cards = grid.querySelectorAll('.service-card');
            cards.forEach((card, i) => {
                const side = card.dataset.side || (i % 2 === 0 ? 'left' : 'right');
                const fromX = side === 'left' ? -140 : 140;
                gsap.set(card, { opacity: 0, x: fromX, scale: 0.94 });
                gsap.to(card, {
                    opacity: 1, x: 0, scale: 1, duration: 0.7, ease: 'power4.out',
                    scrollTrigger: { trigger: card, start: 'top 88%' },
                    clearProps: 'transform'
                });
            });
        });

        // 2b. Process / Why-Choose-Us Cards — pop-and-settle cascade with a slight rotation wobble
        gsap.utils.toArray('.process-grid').forEach(grid => {
            const items = grid.querySelectorAll('.process-item');
            gsap.set(items, { opacity: 0, scale: 0.8, rotate: -4 });
            gsap.to(items, {
                opacity: 1, scale: 1, rotate: 0, duration: 0.7, stagger: 0.1, ease: 'back.out(1.9)',
                scrollTrigger: { trigger: grid, start: 'top 85%' },
                clearProps: 'transform'
            });
        });

        // 2c. Stats — numbers count up from zero as they slide into view
        gsap.utils.toArray('.stats-grid').forEach(grid => {
            const items = grid.querySelectorAll('.stat-item');
            gsap.set(items, { opacity: 0, y: 30 });
            gsap.to(items, {
                opacity: 1, y: 0, duration: 0.6, stagger: 0.15, ease: 'power2.out',
                scrollTrigger: { trigger: grid, start: 'top 85%' },
                clearProps: 'transform'
            });
            items.forEach(item => {
                const numEl = item.querySelector('.stat-num');
                if (!numEl) return;
                const raw = numEl.textContent.trim();
                const match = raw.match(/[\d.]+/);
                if (!match) return;
                const target = parseFloat(match[0]);
                const suffix = raw.replace(match[0], '');
                const digits = match[0].replace('.', '').length; // preserve leading-zero style, e.g. "09"
                const counter = { val: 0 };
                gsap.to(counter, {
                    val: target, duration: 1.6, ease: 'power2.out',
                    scrollTrigger: { trigger: item, start: 'top 85%' },
                    onUpdate: () => {
                        const display = Number.isInteger(target)
                            ? String(Math.round(counter.val)).padStart(digits, '0')
                            : counter.val.toFixed(1);
                        numEl.textContent = display + suffix;
                    }
                });
            });
        });

        // 2d. Footer link columns — cascade in sideways like a list being dealt out
        gsap.utils.toArray('.footer-col').forEach((col, colIndex) => {
            const links = col.querySelectorAll('a');
            if (links.length === 0) return;
            gsap.set(links, { opacity: 0, x: -24 });
            gsap.to(links, {
                opacity: 1, x: 0, duration: 0.6, stagger: 0.08, delay: colIndex * 0.1, ease: 'power2.out',
                scrollTrigger: { trigger: col, start: 'top 95%' },
                clearProps: 'transform'
            });
        });

        // 1. Basic Reveals (everything else still carrying the plain .reveal class)
        // IMPORTANT: clearProps only removes the transform GSAP itself added.
        // Using clearProps:'all' here would wipe the ENTIRE inline style attribute,
        // including hand-authored inline styles like font-size: clamp(...),
        // max-width, color, margin-bottom, etc. that many headings/paragraphs
        // rely on — causing big text to shrink back down to the browser's
        // default heading size right after it reveals.
        gsap.utils.toArray('.reveal').forEach(el => {
            gsap.to(el, {
                opacity: 1, y: 0, duration: 0.8, ease: 'power2.out',
                scrollTrigger: { trigger: el, start: 'top 90%' },
                clearProps: 'transform'
            });
        });

        // 3. Hero Scale Wipe (Home Only)
        if (document.querySelector('.hero-wrap')) {
            gsap.to('.hero', {
                scale: 1.5, opacity: 0, ease: 'none',
                scrollTrigger: { trigger: '.hero-wrap', start: 'top top', end: 'bottom top', scrub: 1 }
            });
        }

        // 4. Velocity Marquee (Home Only)
        const marqueeTrack = document.getElementById('marqueeTrack');
        if (marqueeTrack) {
            let marqueeX = 0; let currentSpeed = 2;
            gsap.ticker.add(() => {
                marqueeX -= currentSpeed;
                currentSpeed *= 0.95;
                if (currentSpeed < 2) currentSpeed = 2;
                if (marqueeX < -marqueeTrack.scrollWidth / 2) marqueeX = 0;
                marqueeTrack.style.transform = `translateX(${marqueeX}px)`;
            });
            ScrollTrigger.create({
                trigger: '#marquee', start: 'top bottom', end: 'bottom top',
                onUpdate: (self) => { currentSpeed += self.getVelocity() / 3000; }
            });
        }

        // 5. Manifesto Scrub (Home Only)
        const manifestoText = document.getElementById('manifestoText');
        if (manifestoText) {
            // Use textContent (not innerHTML) and split on whitespace so we
            // don't depend on exact single-space formatting in the source HTML.
            const words = manifestoText.textContent.trim().split(/\s+/);
            // Join with a real space CHARACTER BETWEEN the spans (not inside
            // one). A space sitting inside an inline-block span gets collapsed
            // away by the browser at the box's edge — that's what was gluing
            // every word together with no gaps. A space between two
            // inline-block boxes always renders correctly.
            manifestoText.innerHTML = words.map(word => {
                const isAccent = word === 'scalable,' || word === 'bug-free';
                return `<span class="word ${isAccent ? 'accent' : ''}">${word}</span>`;
            }).join(' ');
            gsap.to('.manifesto .word', { color: 'rgba(255,255,255,1)', stagger: 1, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top 70%', end: 'center center', scrub: 1 } });
            gsap.to('.manifesto .word.accent', { color: '#0047FF', stagger: 1, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top 70%', end: 'center center', scrub: 1 } });
        }

        // 6. MatchMedia for Desktop Pinned Sections
        let mm = gsap.matchMedia();

        mm.add("(min-width: 901px)", () => {

            // 6A. Horizontal Scroll Portfolio (Home Page)
            const track = document.getElementById('workTrack');
            if (track) {
                const bgText = document.querySelector('.work-bg-text');
                const getScrollAmount = () => {
                    let trackWidth = track.scrollWidth;
                    let distance = trackWidth - window.innerWidth + 200;
                    return distance > 0 ? distance : 0;
                };

                let tl = gsap.timeline({
                    scrollTrigger: {
                        trigger: "#work-home",
                        start: "top top",
                        end: () => "+=" + getScrollAmount(),
                        pin: true,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        anticipatePin: 1
                    }
                });

                tl.to(track, { x: () => -getScrollAmount(), ease: "none" });
                if (bgText) tl.to(bgText, { x: () => -getScrollAmount() * 0.5, ease: "none" }, 0);
            }

            // 6B. 3D Stacked Cards (Work Page)
            const stackCards = gsap.utils.toArray('.stack-card');
            if (stackCards.length > 0) {
                const counter = document.querySelector('.stack-counter .current-num');
                const totalNum = document.querySelector('.stack-counter .total-num');
                const dots = gsap.utils.toArray('.stack-nav .nav-dot');

                if (totalNum) totalNum.textContent = String(stackCards.length).padStart(2, '0');

                stackCards.forEach((card, i) => {
                    if (i === 0) {
                        gsap.set(card, { y: 0, opacity: 1, scale: 1, zIndex: i });
                    } else {
                        gsap.set(card, { y: window.innerHeight, opacity: 1, scale: 1, zIndex: i });
                    }
                });

                const tlStack = gsap.timeline({
                    scrollTrigger: {
                        trigger: "#work-stack",
                        start: "top top",
                        end: () => "+=" + (stackCards.length * 100) + "%",
                        pin: true,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        onUpdate: (self) => {
                            let progress = self.progress * (stackCards.length);
                            let activeIndex = Math.floor(progress);
                            if (activeIndex >= stackCards.length) activeIndex = stackCards.length - 1;

                            if (counter) counter.textContent = String(activeIndex + 1).padStart(2, '0');

                            if (dots.length > 0) {
                                dots.forEach((dot, i) => {
                                    if (i === activeIndex) dot.classList.add('active');
                                    else dot.classList.remove('active');
                                });
                            }
                        }
                    }
                });

                for (let i = 0; i < stackCards.length - 1; i++) {
                    const currentCard = stackCards[i];
                    const nextCard = stackCards[i + 1];

                    tlStack.to(currentCard, { scale: 0.85, y: "-10%", ease: "none" }, i);
                    tlStack.fromTo(nextCard, { y: "100vh", scale: 1 }, { y: 0, scale: 1, ease: "none" }, i);
                }
            }

            // 6C. Team Slideshow — auto-advances as you scroll (About page)
            const teamSlideshow = document.querySelector('.team-slideshow');
            const teamSlides = gsap.utils.toArray('.team-slide');
            if (teamSlideshow && teamSlides.length > 1) {
                const teamCounter = document.getElementById('teamCurrent');

                gsap.set(teamSlides, { display: 'grid', position: 'absolute', top: 0, left: 0, width: '100%' });
                gsap.set(teamSlides.slice(1), { opacity: 0, x: 50 });
                gsap.set(teamSlides[0], { opacity: 1, x: 0 });

                const tlTeam = gsap.timeline({
                    scrollTrigger: {
                        trigger: '#team-slider',
                        start: 'top top',
                        end: () => '+=' + (teamSlides.length * 70) + '%',
                        pin: true,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        onUpdate: (self) => {
                            const idx = Math.min(teamSlides.length - 1, Math.round(self.progress * (teamSlides.length - 1)));
                            if (teamCounter) teamCounter.textContent = String(idx + 1).padStart(2, '0');
                        }
                    }
                });

                for (let i = 0; i < teamSlides.length - 1; i++) {
                    tlTeam.to(teamSlides[i], { opacity: 0, x: -50, ease: 'none' }, i);
                    tlTeam.to(teamSlides[i + 1], { opacity: 1, x: 0, ease: 'none' }, i);
                }
            }
        });
    }

    function initMicroAnimations() {
        // A. Magnetic Buttons
        if (wantsCustomCursor) {
            document.querySelectorAll('.magnetic').forEach(btn => {
                btn.addEventListener('mousemove', (e) => {
                    const rect = btn.getBoundingClientRect();
                    const x = e.clientX - rect.left - rect.width / 2;
                    const y = e.clientY - rect.top - rect.height / 2;
                    gsap.to(btn, { x: x * 0.3, y: y * 0.3, duration: 0.4, ease: 'power2.out' });
                    gsap.to(btn.querySelector('.btn-inner'), { x: x * 0.2, y: y * 0.2, duration: 0.4, ease: 'power2.out' });
                });
                btn.addEventListener('mouseleave', () => {
                    gsap.to(btn, { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
                    gsap.to(btn.querySelector('.btn-inner'), { x: 0, y: 0, duration: 0.6, ease: 'elastic.out(1, 0.3)' });
                });
            });
        }

        // C. Scroll Progress Bar
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        document.body.appendChild(progressBar);
        gsap.to(progressBar, {
            width: '100%', ease: 'none',
            scrollTrigger: { trigger: 'body', start: 'top top', end: 'bottom bottom', scrub: 0.3 }
        });

        // D. Fixed Side Clients (Home Only)
        const sideClients = document.querySelector('.side-clients');
        if (sideClients) {
            ScrollTrigger.create({
                trigger: '.hero-wrap', start: 'bottom top',
                onEnter: () => sideClients.classList.add('visible'),
                onLeaveBack: () => sideClients.classList.remove('visible')
            });
        }

        // E. Clients Band Velocity Skew (Home Only)
        const clientsTrack = document.querySelector('.clients-track');
        if (clientsTrack) {
            let clX = 0; let clSpeed = 1; let clSkew = 0;
            gsap.ticker.add(() => {
                clX -= clSpeed;
                clSpeed *= 0.95;
                if (clSpeed < 1) clSpeed = 1;
                clSkew *= 0.9;
                if (clX < -clientsTrack.scrollWidth / 2) clX = 0;
                clientsTrack.style.transform = `translateX(${clX}px) skewX(${clSkew}deg)`;
            });
            ScrollTrigger.create({
                trigger: '#clients-band', start: 'top bottom', end: 'bottom top',
                onUpdate: (self) => {
                    clSpeed += self.getVelocity() / 4000;
                    clSkew = Math.min(Math.max(self.getVelocity() / 200, -15), 15);
                }
            });
        }
    }
})();
