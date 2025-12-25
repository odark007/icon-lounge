document.addEventListener('DOMContentLoaded', () => {

    // --- 1. STICKY HEADER EFFECT ---
    const header = document.querySelector('header');
    window.addEventListener('scroll', () => {
        if (header) {
            header.classList.toggle('scrolled', window.scrollY > 50);
        }
    });

    // --- 2. MOBILE HAMBURGER MENU ---
    const hamburger = document.querySelector('.hamburger');
    const navLinks = document.querySelector('.nav-links');
    const navItems = document.querySelectorAll('.nav-links li a');

    // Added ? for safety
    hamburger?.addEventListener('click', () => {
        if (!navLinks) return;
        navLinks.classList.toggle('active');
        const icon = hamburger.querySelector('i');
        if (icon) {
            if (navLinks.classList.contains('active')) {
                icon.classList.replace('fa-bars', 'fa-times');
            } else {
                icon.classList.replace('fa-times', 'fa-bars');
            }
        }
    });

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (navLinks?.classList.contains('active')) {
                navLinks.classList.remove('active');
                hamburger.querySelector('i').classList.replace('fa-times', 'fa-bars');
            }
        });
    });

    // --- 3. OLD MENU MODAL (Generic) ---
    const modal = document.getElementById('menuModal');
    const openBtns = document.querySelectorAll('.open-menu');
    const closeBtn = document.querySelector('.close-modal');

    const toggleModal = (display) => {
        if (!modal) return;
        modal.classList.toggle('active', display);
        document.body.style.overflow = display ? 'hidden' : 'auto';
    };

    openBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            toggleModal(true);
        });
    });

    closeBtn?.addEventListener('click', () => toggleModal(false));

    // --- 4. NEW: FEATURED ITEMS LOGIC (Homepage) ---
    const featuredContainer = document.getElementById('featured-items-grid');

    const renderFeatured = () => {
        // Only run if we are on a page with the featured grid (index.html)
        if (!featuredContainer || typeof menuData === 'undefined') return;

        let featuredCount = 0;
        let htmlContent = '';

        menuData.categories.forEach(cat => {
            cat.subCategories.forEach(sub => {
                sub.items.forEach(item => {
                    // Pull only items marked featured, limit to 4
                    if (item.featured && featuredCount < 4) {
                        const imgSrc = item.image || placeholderImage;
                        htmlContent += `
                            <div class="featured-card">
                                <img src="${imgSrc}" alt="${item.name}" class="featured-img" onerror="this.src='${placeholderImage}'">
                                <div class="featured-info">
                                    <h3>${item.name}</h3>
                                    <p>${item.description || ''}</p>
                                </div>
                            </div>
                        `;
                        featuredCount++;
                    }
                });
            });
        });
        featuredContainer.innerHTML = htmlContent;
    };

    // --- 5. NEW: DELIVERY PARTNER MODAL ---
    const deliveryModal = document.getElementById('deliveryModal');
    const openDeliveryBtn = document.getElementById('open-delivery');
    const closeDeliveryBtn = document.getElementById('close-delivery');
    const partnersList = document.getElementById('delivery-partners-list');

    const toggleDeliveryModal = (show) => {
        if (!deliveryModal) return;
        deliveryModal.classList.toggle('active', show);
        document.body.style.overflow = show ? 'hidden' : 'auto';
    };

    openDeliveryBtn?.addEventListener('click', () => toggleDeliveryModal(true));
    closeDeliveryBtn?.addEventListener('click', () => toggleDeliveryModal(false));

    // Populate Delivery Partners from menu-data.js
    if (partnersList && typeof deliveryPartners !== 'undefined') {
        partnersList.innerHTML = deliveryPartners.map(p => `
            <a href="${p.link}" target="_blank" class="delivery-card">
                <img src="${p.logo}" alt="${p.name}" onerror="this.style.display='none'">
                <p>${p.name}</p>
            </a>
        `).join('');
    }

    // --- 6. GLOBAL CLOSE LOGIC (For all modals) ---
    window.addEventListener('click', (e) => {
        if (e.target === modal) toggleModal(false);
        if (e.target === deliveryModal) toggleDeliveryModal(false);
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modal?.classList.contains('active')) toggleModal(false);
            if (deliveryModal?.classList.contains('active')) toggleDeliveryModal(false);
        }
    });

    window.addEventListener('menuDataLoaded', () => {
        renderFeatured();
    });
});