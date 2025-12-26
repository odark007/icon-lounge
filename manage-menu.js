// manage-menu.js
// manage-menu.js
let userRole = 'admin'; // Global role tracker
const placeholderImage = 'images/logo-placeholder.png';

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth Guard
    const user = await checkAuth();
    if (!user) return;

    // 2. Fetch Role before loading other data
    const { data: profile } = await _supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    userRole = profile?.role || 'admin';

    // 3. Initial Data Load
    loadItems();
    loadSubCategories();
    renderDaySelector();

    // 4. Form Listener
    const itemForm = document.getElementById('itemForm');
    if (itemForm) {
        itemForm.addEventListener('submit', handleSaveItem);
    }
});

/**
 * Fetches sub-categories to populate the dropdown in the modal
 */
async function loadSubCategories() {
    const { data, error } = await _supabase.from('sub_categories').select('*');
    if (error) {
        console.error("Error loading subcategories:", error);
        return;
    }
    const select = document.getElementById('itemSubCat');
    if (select) {
        select.innerHTML = data.map(sc => `<option value="${sc.id}">${sc.name}</option>`).join('');
    }
}

/**
 * Fetches all items and renders the management table
 */
async function loadItems() {
    const { data, error } = await _supabase
        .from('items')
        .select('*, sub_categories(name)')
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error loading items:", error);
        return;
    }

    const tbody = document.getElementById('items-table-body');
    if (!tbody) return;

    tbody.innerHTML = data.map(item => `
        <tr class="border-b border-zinc-800 hover:bg-zinc-800/50 transition">
            <td class="p-4 flex items-center space-x-3">
                <img src="${item.image_url || 'images/logo-placeholder.png'}" class="h-10 w-10 object-cover rounded border border-zinc-700">
                <span class="font-medium">${item.name}</span>
            </td>
            <td class="p-4 text-sm text-zinc-500">${item.sub_categories?.name || 'N/A'}</td>
            <td class="p-4 text-sm font-mono text-zinc-400">
                ${Object.entries(item.prices).map(([s, p]) => `${s[0].toUpperCase()}: ${p}`).join(', ')}
            </td>
            <td class="p-4 text-center">
                ${item.featured ? '<span class="text-green-500">✅</span>' : '<span class="text-zinc-600">❌</span>'}
            </td>
            <td class="p-4 text-right">
                <button onclick="editItem(${JSON.stringify(item).replace(/"/g, '&quot;')})" class="text-blue-500 hover:text-blue-400 mr-4">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteItem(${item.id})" class="text-red-500 hover:text-red-400">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

/**
 * Handles both Creating and Updating items
 */
async function handleSaveItem(e) {
    e.preventDefault();
    const saveBtn = document.getElementById('saveBtn');
    saveBtn.innerText = 'Processing...';
    saveBtn.disabled = true;

    const id = document.getElementById('itemId').value;
    const image_url = document.getElementById('itemImagePath').value;

    const prices = {};
    if (document.getElementById('priceSmall').value) prices.small = Number(document.getElementById('priceSmall').value);
    if (document.getElementById('priceMed').value) prices.medium = Number(document.getElementById('priceMed').value);
    if (document.getElementById('priceLarge').value) prices.large = Number(document.getElementById('priceLarge').value);

    // COLLECT SELECTED DAYS
    const selectedDays = Array.from(document.querySelectorAll('input[name="special_days"]:checked'))
        .map(cb => cb.value);

    const payload = {
        name: document.getElementById('itemName').value,
        sub_category_id: document.getElementById('itemSubCat').value,
        description: document.getElementById('itemDesc').value,
        prices: prices,
        featured: document.getElementById('itemFeatured').checked,
        is_special: document.getElementById('itemIsSpecial').checked,
        special_text: document.getElementById('itemSpecialText').value,
        discount_percent: document.getElementById('itemDiscount').value ?
            Number(document.getElementById('itemDiscount').value) : null,
        special_start: document.getElementById('itemSpecialStart').value || null,
        special_end: document.getElementById('itemSpecialEnd').value || null,
        special_days: selectedDays
    };

    // Logic to prevent overwriting images with empty strings
    if (image_url.trim() !== "") {
        payload.image_url = image_url;
    } else if (!id) {
        // Only force placeholder if it's a NEW item
        payload.image_url = "images/logo-placeholder.png";
    }

    // 4. Submit to Database
    let result;
    if (id) {
        // Update existing
        result = await _supabase.from('items').update(payload).eq('id', id);
    } else {
        // Insert new (add placeholder if no image provided)
        if (!payload.image_url) payload.image_url = "images/logo-placeholder.png";
        result = await _supabase.from('items').insert([payload]);
    }

    if (result.error) {
        alert("Database Error: " + result.error.message);
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Item';
    } else {
        closeModal();
        loadItems(); // Refresh table
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Item';
    }
}

/**
 * Deletes an item after confirmation
 */
async function deleteItem(id) {
    if (confirm('Are you sure you want to delete this item? This cannot be undone.')) {
        const { error } = await _supabase.from('items').delete().eq('id', id);
        if (error) alert(error.message);
        else loadItems();
    }
}

/**
 * Modal UI Controls
 */
function openModal() {
    document.getElementById('modalTitle').innerText = 'Add Menu Item';
    document.getElementById('itemForm').reset();
    document.getElementById('itemId').value = '';
    document.getElementById('itemModal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('itemModal').classList.add('hidden');
}

/**
 * Fills the modal with existing item data for editing
 */
window.editItem = (item) => {
    openModal();
    document.getElementById('modalTitle').innerText = 'Edit Menu Item';

    document.getElementById('itemId').value = item.id;
    document.getElementById('itemName').value = item.name;
    document.getElementById('itemSubCat').value = item.sub_category_id;
    document.getElementById('itemDesc').value = item.description || '';
    document.getElementById('itemFeatured').checked = item.featured;

    document.getElementById('itemImagePath').value = item.image_url || '';

    // Fill prices if they exist
    document.getElementById('priceSmall').value = item.prices.small || '';
    document.getElementById('priceMed').value = item.prices.medium || '';
    document.getElementById('priceLarge').value = item.prices.large || '';

    document.getElementById('itemDiscount').value = item.discount_percent || '';
    document.getElementById('itemSpecialText').value = item.special_text || '';
    document.getElementById('itemSpecialStart').value = item.special_start ? item.special_start.slice(0, 16) : '';
    document.getElementById('itemSpecialEnd').value = item.special_end ? item.special_end.slice(0, 16) : '';

    // Toggle fields visibility
    toggleSpecialFields();

    // Populate Checkboxes for days
    const savedDays = item.special_days || [];
    document.querySelectorAll('input[name="special_days"]').forEach(cb => {
        cb.checked = savedDays.includes(cb.value);
    });
};


function renderDaySelector() {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const container = document.getElementById('day-selector');
    if (!container) return;
    container.innerHTML = days.map(day => `
        <label class="flex items-center space-x-1 bg-black border border-zinc-700 p-1 px-2 rounded cursor-pointer hover:border-[#d4af37]">
            <input type="checkbox" name="special_days" value="${day}" class="rounded border-zinc-700">
            <span class="text-xs">${day}</span>
        </label>`).join('');
}

async function deleteSubCat(id) {
    if (confirm('Remove sub-category?')) {
        const { error } = await _supabase.from('sub_categories').delete().eq('id', id);
        if (!error) { loadSettingsData(); loadSubCategories(); }
    }
}

function switchTab(tab) {
    // Toggle Sections
    document.getElementById('section-items').classList.toggle('hidden', tab !== 'items');
    document.getElementById('section-settings').classList.toggle('hidden', tab !== 'settings');

    // Toggle Sidebar Button Styles
    const itemsBtn = document.getElementById('tab-items');
    const settingsBtn = document.getElementById('tab-settings');

    if (tab === 'items') {
        itemsBtn.classList.add('bg-zinc-800', 'text-[#d4af37]');
        settingsBtn.classList.remove('bg-zinc-800', 'text-[#d4af37]');
    } else {
        settingsBtn.classList.add('bg-zinc-800', 'text-[#d4af37]');
        itemsBtn.classList.remove('bg-zinc-800', 'text-[#d4af37]');
        loadSettingsData();
    }
}

function toggleSpecialFields() {
    const isChecked = document.getElementById('itemIsSpecial').checked;
    document.getElementById('special-fields').classList.toggle('hidden', !isChecked);
}

async function loadSettingsData() {
    const { data: categories } = await _supabase.from('categories').select('*');
    const { data: subCats } = await _supabase.from('sub_categories').select('*, categories(name)');
    document.getElementById('parentCatId').innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    document.getElementById('sub-cat-list').innerHTML = subCats.map(sc => `
        <div class="flex justify-between items-center bg-black p-2 rounded border border-zinc-800 mb-2">
            <span>${sc.name} <small class="text-zinc-500">(${sc.categories.name})</small></span>
            <button onclick="deleteSubCat(${sc.id})" class="text-red-500 text-xs">Remove</button>
        </div>`).join('');

    // Fetch SMS Settings
    const { data: smsSets } = await _supabase.from('sms_settings').select('*');
    if (smsSets) {
        smsSets.forEach(s => {
            const el = document.getElementById(`set-${s.key_name.replace(/_/g, '-')}`);
            if (el) el.value = s.value;
            // Fallback check for the specific 'thank_you_template' key
            if (s.key_name === 'thank_you_template') document.getElementById('set-thank-you').value = s.value;
        });
    }

    // 5. RBAC Visibility: Hide settings if not Superadmin
    const smsGroup = document.getElementById('sms-settings-group');
    if (smsGroup) {
        smsGroup.classList.toggle('hidden', userRole !== 'superadmin');
    }
}

async function addSubCategory() {
    const name = document.getElementById('newSubCatName').value;
    const category_id = document.getElementById('parentCatId').value;
    if (!name) return;
    const { error } = await _supabase.from('sub_categories').insert([{ name, category_id }]);
    if (!error) { document.getElementById('newSubCatName').value = ''; loadSettingsData(); loadSubCategories(); }
}


// --- Logic: Save SMS System Settings ---
async function saveSmsSettings() {
    const settings = [
        { key: 'thank_you_template', val: document.getElementById('set-thank-you').value },
        { key: 'review_link', val: document.getElementById('set-review-link').value },
        { key: 'website_link', val: document.getElementById('set-website-link').value }
    ];

    for (const s of settings) {
        await _supabase.from('sms_settings').update({ value: s.val }).eq('key_name', s.key);
    }

    alert("System settings updated successfully!");
}