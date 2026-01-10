// manage-menu.js
let userRole = 'admin'; // Global role tracker
const placeholderImage = 'images/logo-placeholder.png';

// --- NEW: Helper to upload image to Supabase Storage ---
async function uploadImage(file) {
    const fileExt = file.name.split('.').pop();
    const fileName = `item-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Upload to 'menu-images' bucket
    const { data, error } = await _supabase.storage
        .from('menu-images')
        .upload(filePath, file);

    if (error) throw error;

    // Get public URL
    const { data: { publicUrl } } = _supabase.storage
        .from('menu-images')
        .getPublicUrl(filePath);

    return publicUrl;
}
// -------------------------------------------------------

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
 * Helper to format prices for the admin table
 */
function formatPricesForTable(prices) {
    if (!prices) return '';

    const labels = {
        standard: 'Std',
        small: 'S',
        medium: 'M',
        large: 'L',
        xl: 'XL'
    };

    return Object.entries(prices)
        .map(([key, val]) => {
            const label = labels[key] || key;
            return `<span class="bg-zinc-800 px-2 py-0.5 rounded text-xs border border-zinc-700">${label}: ${val}</span>`;
        })
        .join(' ');
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
                <img src="${item.image_url || placeholderImage}" class="h-10 w-10 object-cover rounded border border-zinc-700" onerror="this.src='${placeholderImage}'">
                <span class="font-medium">${item.name}</span>
            </td>
            <td class="p-4 text-sm text-zinc-500">${item.sub_categories?.name || 'N/A'}</td>
            <td class="p-4 text-sm font-mono text-zinc-400 flex flex-wrap gap-1">
                ${formatPricesForTable(item.prices)}
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
    
    // --- IMAGE UPLOAD LOGIC ---
    const imageFile = document.getElementById('itemImageFile').files[0];
    const existingUrl = document.getElementById('itemImageUrl').value;
    let finalImageUrl = existingUrl; // Default to existing

    try {
        if (imageFile) {
            saveBtn.innerText = 'Uploading Image...';
            finalImageUrl = await uploadImage(imageFile);
        }
    } catch (error) {
        alert("Image Upload Failed: " + error.message);
        saveBtn.disabled = false;
        saveBtn.innerText = 'Save Item';
        return; // Stop execution
    }

    // --- NEW PRICING LOGIC ---
    const prices = {};

    const getVal = (elementId) => {
        const el = document.getElementById(elementId);
        return (el && el.value !== "") ? Number(el.value) : null;
    };

    const pStd = getVal('priceStandard');
    const pS = getVal('priceSmall');
    const pM = getVal('priceMed');
    const pL = getVal('priceLarge');
    const pXL = getVal('priceXL');

    // Only add to object if value exists (non-null)
    if (pStd !== null) prices.standard = pStd;
    if (pS !== null) prices.small = pS;
    if (pM !== null) prices.medium = pM;
    if (pL !== null) prices.large = pL;
    if (pXL !== null) prices.xl = pXL;
    // -------------------------

    // COLLECT SELECTED DAYS
    const selectedDays = Array.from(document.querySelectorAll('input[name="special_days"]:checked'))
        .map(cb => cb.value);

    const payload = {
        name: document.getElementById('itemName').value,
        sub_category_id: document.getElementById('itemSubCat').value,
        description: document.getElementById('itemDesc').value,
        prices: prices,
        image_url: finalImageUrl || placeholderImage,
        featured: document.getElementById('itemFeatured').checked,
        is_special: document.getElementById('itemIsSpecial').checked,
        special_text: document.getElementById('itemSpecialText').value,
        discount_percent: document.getElementById('itemDiscount').value ? Number(document.getElementById('itemDiscount').value) : null,
        special_start: document.getElementById('itemSpecialStart').value || null,
        special_end: document.getElementById('itemSpecialEnd').value || null,
        special_days: selectedDays
    };

    // 4. Submit to Database
    let result;
    if (id) {
        // Update existing
        result = await _supabase.from('items').update(payload).eq('id', id);
    } else {
        // Insert new
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
    // Clear specific fields manually just in case
    document.getElementById('itemSubCat').selectedIndex = 0;
    
    // Reset Image UI
    document.getElementById('itemImageUrl').value = '';
    document.getElementById('imagePreview').src = '';
    document.getElementById('imagePreviewContainer').classList.add('hidden');
    document.getElementById('itemImageFile').value = '';

    toggleSpecialFields();
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

    // --- Fill prices (Handle new structure) ---
    document.getElementById('priceStandard').value = item.prices.standard || '';
    document.getElementById('priceSmall').value = item.prices.small || '';
    document.getElementById('priceMed').value = item.prices.medium || '';
    document.getElementById('priceLarge').value = item.prices.large || '';
    document.getElementById('priceXL').value = item.prices.xl || '';

    document.getElementById('itemDiscount').value = item.discount_percent || '';
    document.getElementById('itemSpecialText').value = item.special_text || '';

    // Handle Dates safely
    document.getElementById('itemSpecialStart').value = item.special_start ? item.special_start.slice(0, 16) : '';
    document.getElementById('itemSpecialEnd').value = item.special_end ? item.special_end.slice(0, 16) : '';

    // Handle Special Checkbox logic
    document.getElementById('itemIsSpecial').checked = item.is_special || false;
    toggleSpecialFields();

    // Populate Checkboxes for days
    const savedDays = item.special_days || [];
    document.querySelectorAll('input[name="special_days"]').forEach(cb => {
        cb.checked = savedDays.includes(cb.value);
    });

    // Handle Image Preview
    const currentImg = item.image_url || '';
    document.getElementById('itemImageUrl').value = currentImg; // Set hidden input
    document.getElementById('itemImageFile').value = ""; // Reset file picker

    if (currentImg && !currentImg.includes('placeholder')) {
        document.getElementById('imagePreview').src = currentImg;
        document.getElementById('imagePreviewContainer').classList.remove('hidden');
    } else {
        document.getElementById('imagePreviewContainer').classList.add('hidden');
    }
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
    document.getElementById('section-items').classList.toggle('hidden', tab !== 'items');
    document.getElementById('section-settings').classList.toggle('hidden', tab !== 'settings');

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
    
    const parentCatSelect = document.getElementById('parentCatId');
    if (parentCatSelect) {
        parentCatSelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }

    const subCatList = document.getElementById('sub-cat-list');
    if (subCatList) {
        subCatList.innerHTML = subCats.map(sc => `
            <div class="flex justify-between items-center bg-black p-2 rounded border border-zinc-800 mb-2">
                <span>${sc.name} <small class="text-zinc-500">(${sc.categories.name})</small></span>
                <button onclick="deleteSubCat(${sc.id})" class="text-red-500 text-xs">Remove</button>
            </div>`).join('');
    }

    // Fetch SMS Settings
    const { data: smsSets } = await _supabase.from('sms_settings').select('*');
    if (smsSets) {
        smsSets.forEach(s => {
            const el = document.getElementById(`set-${s.key_name.replace(/_/g, '-')}`);
            if (el) el.value = s.value;
            if (s.key_name === 'thank_you_template') document.getElementById('set-thank-you').value = s.value;
        });
    }

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