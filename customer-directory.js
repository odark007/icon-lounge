let userRole = 'admin';
let fetchedCustomers = [];

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;


    // 1. Check Role from Profile
    const { data: profile, error: profileErr } = await _supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle(); // Changed from .single() to avoid 406 error

    if (profileErr) {
        console.error("Profile Fetch Error:", profileErr.message);
    } else if (!profile) {
        console.warn("No profile found for this user. Defaulting to admin.");
    } else {
        userRole = profile.role;
        console.log("Access Level Verified:", userRole);
    }

    if (userRole === 'superadmin') {
        document.getElementById('superadmin-only-nav')?.classList.remove('hidden');
    }

    loadCustomers();

    // 2. Real-time Duplicate Check
    const phoneInput = document.getElementById('custPhone');
    phoneInput.addEventListener('input', debounce(checkDuplicatePhone, 500));

    // 3. Search Logic
    document.getElementById('directorySearch').addEventListener('input', (e) => {
        loadCustomers(e.target.value);
    });

    document.getElementById('customerForm').addEventListener('submit', handleSaveCustomer);
});

// --- Utility: Standardize Phone Number ---
function standardizePhone(phone) {
    let clean = phone.replace(/\D/g, ''); // Remove non-digits
    if (clean.startsWith('0')) clean = '233' + clean.substring(1);
    if (clean.length === 9) clean = '233' + clean;
    return clean;
}

// --- Logic: Duplicate Check ---
async function checkDuplicatePhone() {
    const phone = standardizePhone(document.getElementById('custPhone').value);
    const id = document.getElementById('customerId').value;
    if (phone.length < 9) return;

    const { data } = await _supabase.from('customers').select('id').eq('phone', phone).maybeSingle();

    const warning = document.getElementById('dupWarning');
    const saveBtn = document.getElementById('saveCustBtn');

    // If found and not the current ID we are editing
    if (data && data.id != id) {
        warning.classList.remove('hidden');
        saveBtn.disabled = true;
        saveBtn.classList.add('opacity-50');
    } else {
        warning.classList.add('hidden');
        saveBtn.disabled = false;
        saveBtn.classList.remove('opacity-50');
    }
}

async function loadCustomers(search = '') {
    let query = _supabase.from('customers').select('*').order('created_at', { ascending: false });

    if (search) {
        query = query.or(`first_name.ilike.%${search}%,surname.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data } = await query;
    // 1. Store the data in our global variable for the ID lookup
    fetchedCustomers = data || [];

    const tbody = document.getElementById('customer-table-body');

    tbody.innerHTML = fetchedCustomers.map(c => {
        // Masking logic: show only last 3 digits for standard admins
        const displayPhone = userRole === 'superadmin'
            ? c.phone
            : c.phone.slice(-3).padStart(c.phone.length, '*');

        return `
        <tr class="border-b border-zinc-800 hover:bg-zinc-800/50 transition">
            <td class="p-4 font-medium">${c.first_name || ''} ${c.surname || ''}</td>
            <td class="p-4 text-zinc-400 font-mono">${displayPhone}</td>
            <td class="p-4 text-xs text-zinc-500">${new Date(c.created_at).toLocaleDateString()}</td>
            <td class="p-4 text-right space-x-2">
                ${userRole === 'superadmin' ? `
                    <button onclick="editCustomer(${c.id})" class="text-blue-500"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteCustomer(${c.id})" class="text-red-500"><i class="fas fa-trash"></i></button>
                ` : `
                    <button onclick="editCustomer(${c.id})" class="text-zinc-500"><i class="fas fa-eye"></i></button>
                `}
            </td>
        </tr>`;
    }).join('');
}

async function handleSaveCustomer(e) {
    e.preventDefault();
    const id = document.getElementById('customerId').value;
    const rawPhone = document.getElementById('custPhone').value;
    const phone = standardizePhone(rawPhone);

    // Confirmation Layer for NEW numbers (Admin Only)
    if (!id && userRole === 'admin') {
        const confirmed = confirm(`Please confirm the number: ${phone}\n\nYou will not be able to edit this number after saving.`);
        if (!confirmed) return;
    }

    const payload = {
        phone: phone,
        first_name: document.getElementById('custFirst').value,
        surname: document.getElementById('custLast').value
    };

    let result;
    if (id) {
        result = await _supabase.from('customers').update(payload).eq('id', id);
    } else {
        result = await _supabase.from('customers').insert([payload]);
    }

    if (result.error) alert(result.error.message);
    else {
        closeCustomerModal();
        loadCustomers();
    }
}

async function deleteCustomer(id) {
    if (userRole !== 'superadmin') return;
    if (confirm('Delete this customer?')) {
        await _supabase.from('customers').delete().eq('id', id);
        loadCustomers();
    }
}

// Helpers
function openCustomerModal() {
    const form = document.getElementById('customerForm');
    if (form) form.reset();

    document.getElementById('customerId').value = '';
    document.getElementById('customerModal').classList.remove('hidden');

    // Default state: Phone enabled, Save button visible
    document.getElementById('custPhone').disabled = false;
    const saveBtn = document.getElementById('saveCustBtn');
    if (saveBtn) saveBtn.classList.remove('hidden');

    document.getElementById('modalTitle').innerText = 'Add New Customer';
}


function closeCustomerModal() { document.getElementById('customerModal').classList.add('hidden'); }

window.editCustomer = (id) => {
    const c = fetchedCustomers.find(item => item.id === id);
    if (!c) return;

    // 1. Open and Reset Modal first!
    openCustomerModal();

    const isSA = (userRole === 'superadmin');
    const phoneInput = document.getElementById('custPhone');
    const saveBtn = document.getElementById('saveCustBtn');
    const modalTitle = document.getElementById('modalTitle');

    // 2. Populate values based on Role
    modalTitle.innerText = isSA ? 'Edit Customer' : 'View Customer';
    document.getElementById('customerId').value = c.id;
    document.getElementById('custFirst').value = c.first_name || '';
    document.getElementById('custLast').value = c.surname || '';

    // 3. Handle Phone Masking and Field Locking
    phoneInput.value = isSA ? c.phone : c.phone.slice(-3).padStart(c.phone.length, '*');
    phoneInput.disabled = !isSA;

    // 4. Toggle Save Button Visibility
    if (saveBtn) {
        if (isSA) {
            saveBtn.classList.remove('hidden');
        } else {
            saveBtn.classList.add('hidden');
        }
    }
};

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}