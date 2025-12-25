document.addEventListener('DOMContentLoaded', () => {
    let orderBasket = {}; // Scoped inside DOMContentLoaded

    const menuDisplay = document.getElementById('menu-display');
    const orderBar = document.getElementById('order-bar');
    const urlParams = new URLSearchParams(window.location.search);
    const searchInput = document.getElementById('menu-search');

    // --- Special Offer Validator ---
    const isOfferActive = (item) => {
        if (!item.isSpecial) return false;

        const now = new Date();
        const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });

        // 1. Check Date Range
        if (item.specialStart && new Date(item.specialStart) > now) return false;
        if (item.specialEnd && new Date(item.specialEnd) < now) return false;

        // 2. Check Recurring Days (if any are selected)
        if (item.specialDays && item.specialDays.length > 0) {
            if (!item.specialDays.includes(currentDay)) return false;
        }

        return true;
    };

    // Only one declaration needed
    let isOrderMode = urlParams.get('mode') === 'order';

    const orderToggleBtn = document.getElementById('toggle-order-mode');

    const updateToggleUI = () => {
        orderToggleBtn.innerText = isOrderMode ? "Viewing Mode" : "Start Ordering";
        orderToggleBtn.classList.toggle('btn-fill', isOrderMode);
    };

    orderToggleBtn?.addEventListener('click', () => {
        isOrderMode = !isOrderMode; // Toggle state
        updateToggleUI();
        renderMenu(); // Re-render everything with/without quantity controls
    });

    updateToggleUI(); // Initialize button text

    // 1. Search Logic
    searchInput?.addEventListener('input', (e) => {
        const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
        renderMenu(activeFilter, e.target.value);
    });

    // 2. Main Render Engine
    const renderMenu = (filter = 'all', search = '') => {
        let html = '';

        if (!menuData || !menuData.categories) return;

        menuData.categories.forEach(cat => {
            // Category level filter - Check name against filter (e.g., "Food" vs "food")
            if (filter !== 'all' && filter !== 'specials') {
                if (cat.name.toLowerCase() !== filter.toLowerCase()) return;
            }

            let categoryHtml = `<div class="category-section">`;

            // Friday Badge Logic
            const isFriday = new Date().getDay() === 5;
            if (cat.specialOffer && cat.showOffer && isFriday) {
                categoryHtml += `<div class="special-badge"><i class="fas fa-tag"></i> ${cat.specialOffer}</div>`;
            }

            let hasVisibleSubCats = false;

            cat.subCategories.forEach(sub => {
                // Determine which items to show based on search and "Specials" filter
                const filteredItems = sub.items.filter(item => {
                    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());

                    // If the "Special Offers" filter is clicked
                    if (filter === 'specials') {
                        return matchesSearch && isOfferActive(item);
                    }

                    return matchesSearch;
                });

                if (filteredItems.length === 0) return;
                hasVisibleSubCats = true;

                categoryHtml += `<h3 class="subcategory-title">${sub.name}</h3>`;

                filteredItems.forEach(item => {
                    const imgSrc = item.image || placeholderImage;
                    const activeSpecial = isOfferActive(item);

                    categoryHtml += `
                    <div class="menu-card ${activeSpecial ? 'border-special' : ''}">
                        <div class="image-container">
                            <img src="${imgSrc}" class="menu-card-img" alt="${item.name}" onerror="this.src='${placeholderImage}'">
                            ${activeSpecial ? `<div class="special-tag">${item.specialText || 'Special Offer'}</div>` : ''}
                        </div>
                        
                        <div class="menu-card-content">
                            <div class="menu-card-header">
                                <div>
                                    <h4>${item.name} ${activeSpecial ? '<i class="fas fa-star text-gold"></i>' : ''}</h4>
                                    <p style="font-size:0.8rem; color:var(--text-gray)">${item.description || ''}</p>
                                </div>
                                <div class="price-list">
                                    ${Object.entries(item.prices).map(([size, price]) => {
                        if (activeSpecial && item.discount) {
                            const discounted = (price * (1 - item.discount / 100)).toFixed(2);
                            return `<div class="price-row">
                                                        <span class="old-price">GHS ${price}</span>
                                                        <span class="new-price">${size}: GHS ${discounted}</span>
                                                    </div>`;
                        }
                        return `<div>${size}: GHS ${price}</div>`;
                    }).join('')}
                                </div>
                            </div>
                            ${isOrderMode ? renderOrderControls(item) : ''}
                        </div>
                    </div>`;
                });
            });

            categoryHtml += `</div>`;

            // Only add the category to the final HTML if it actually has items to show
            if (hasVisibleSubCats) {
                html += categoryHtml;
            }
        });

        menuDisplay.innerHTML = html || '<p class="text-center">No items found matching your criteria.</p>';
    };


    // 3. Order Controls (Updated for UI Persistence)
    const renderOrderControls = (item) => {
        let sizeHtml = '<div class="order-management">';
        Object.entries(item.prices).forEach(([size, price]) => {
            const controlId = `${item.id}-${size}`;
            const savedQty = orderBasket[controlId]?.qty || 0; // Check basket
            sizeHtml += `
                <div class="size-row">
                    <span class="size-label">${size} (GHS ${price})</span>
                    <div class="qty-controls">
                        <button class="qty-btn" onclick="updateQty('${controlId}', -1, '${item.name}', '${size}', ${price})">-</button>
                        <span id="qty-${controlId}">${savedQty}</span>
                        <button class="qty-btn" onclick="updateQty('${controlId}', 1, '${item.name}', '${size}', ${price})">+</button>
                    </div>
                </div>
            `;
        });
        return sizeHtml + '</div>';
    };

    // 4. Global Qty Update
    window.updateQty = (controlId, change, itemName, size, price) => {
        const qtyEl = document.getElementById(`qty-${controlId}`);
        let currentQty = orderBasket[controlId]?.qty || 0;
        let newQty = Math.max(0, currentQty + change);

        if (qtyEl) qtyEl.innerText = newQty;

        if (newQty > 0) {
            orderBasket[controlId] = { name: itemName, size: size, qty: newQty, price: price };
        } else {
            delete orderBasket[controlId];
        }
        updateOrderBar();
    };

    // 5. Order Bar Logic
    const updateOrderBar = () => {
        const itemCountEl = document.getElementById('item-count');
        const totalPriceEl = document.getElementById('total-price');
        let totalItems = 0;
        let totalPrice = 0;

        Object.values(orderBasket).forEach(item => {
            totalItems += item.qty;
            totalPrice += (item.qty * item.price);
        });

        if (itemCountEl) itemCountEl.innerText = totalItems;
        if (totalPriceEl) totalPriceEl.innerText = `GHS ${totalPrice}`;
        orderBar?.classList.toggle('active', totalItems > 0);
    };

    // 6. WhatsApp Message Generator (MOVED INSIDE)
    const whatsappBtn = document.getElementById('whatsapp-send');
    whatsappBtn?.addEventListener('click', () => {
        if (Object.keys(orderBasket).length === 0) return;

        let message = "Hello Icon Lounge! I'd like to place an order:\n\n";
        let grandTotal = 0;

        Object.values(orderBasket).forEach(item => {
            const subtotal = item.qty * item.price;
            message += `• ${item.qty}x ${item.name} (${item.size}) - GHS ${subtotal}\n`;
            grandTotal += subtotal;
        });

        message += `\n*Grand Total: GHS ${grandTotal}*`;
        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/${contactInfo.whatsapp}?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    });

    // 7. Filter Buttons Logic
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelector('.filter-btn.active').classList.remove('active');
            e.target.classList.add('active');
            renderMenu(e.target.dataset.filter);
        });
    });

    // Wait for Supabase data before rendering
    window.addEventListener('menuDataLoaded', () => {
        renderMenu();
    });
});


