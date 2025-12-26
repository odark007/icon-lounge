let smsSettings = {};
let userRole = 'admin';
let selectedCustomerId = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    // 1. Fetch User Role
    const { data: profile } = await _supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    userRole = profile?.role || 'admin';
    if (userRole === 'superadmin') document.getElementById('superadmin-only-nav')?.classList.remove('hidden');

    // 2. Set Default Date
    document.getElementById('serviceDate').valueAsDate = new Date();

    // 3. Load Global Settings (Links)
    const { data } = await _supabase.from('sms_settings').select('*');
    if (data) data.forEach(s => smsSettings[s.key_name] = s.value);

    // 4. Listeners
    document.getElementById('servePhone').addEventListener('input', handlePhoneInput);
    document.getElementById('serveName').addEventListener('input', updatePreview);
    document.getElementById('customText').addEventListener('input', updatePreview);

    updatePreview(); // Initial Run
});

function toggleMsgType() {
    const isCustom = document.querySelector('input[name="msgType"]:checked').value === 'custom';
    document.getElementById('customMsgArea').classList.toggle('hidden', !isCustom);
    updatePreview();
}

async function handlePhoneInput(e) {
    const input = e.target.value;
    const suggestions = document.getElementById('phoneSuggestions');

    if (input.length < 3) {
        suggestions.classList.add('hidden');
        return;
    }

    const { data } = await _supabase
        .from('customers')
        .select('*')
        .ilike('phone', `%${input}%`)
        .limit(5);

    if (data && data.length > 0) {
        suggestions.innerHTML = data.map(c => {
            const displayPhone = userRole === 'superadmin'
                ? c.phone
                : c.phone.slice(-3).padStart(c.phone.length, '*');

            return `
            <div class="p-2 hover:bg-[#d4af37] hover:text-black cursor-pointer text-sm" 
                 onclick="selectCustomer(${JSON.stringify(c).replace(/"/g, '&quot;')})">
                ${displayPhone} - ${c.first_name || ''}
            </div>`;
        }).join('');
        suggestions.classList.remove('hidden');
        document.getElementById('saveNewCustGroup').classList.add('hidden');
    } else {
        suggestions.classList.add('hidden');
        document.getElementById('saveNewCustGroup').classList.remove('hidden');
        selectedCustomerId = null;
    }
    updatePreview();
}

window.selectCustomer = (c) => {
    document.getElementById('servePhone').value = c.phone;
    document.getElementById('serveName').value = c.first_name || '';
    document.getElementById('phoneSuggestions').classList.add('hidden');
    document.getElementById('saveNewCustGroup').classList.add('hidden');
    selectedCustomerId = c.id;
    updatePreview();
};

function updatePreview() {
    const firstName = document.getElementById('serveName').value || smsSettings.fallback_name;
    const msgType = document.querySelector('input[name="msgType"]:checked').value;
    let message = "";

    if (msgType === 'template') {
        message = `Hello ${firstName}, thank you for visiting Icon Lounge! We hope you enjoyed your service. Please leave us a review here: ${smsSettings.review_link}`;
    } else {
        message = document.getElementById('customText').value.replace('{{first_name}}', firstName);
        if (document.getElementById('addWebsite').checked) message += `\nVisit us: ${smsSettings.website_link}`;
        if (document.getElementById('addReview').checked) message += `\nReview us: ${smsSettings.review_link}`;
    }

    document.getElementById('msgPreview').innerText = message;

    // Character Counter
    const len = message.length;
    const segments = Math.ceil(len / 160);
    document.getElementById('charCount').innerText = `${len} characters (${segments} segment${segments > 1 ? 's' : ''})`;
}

async function handleSendServedSMS() {
    const phone = document.getElementById('servePhone').value;
    const name = document.getElementById('serveName').value;
    const message = document.getElementById('msgPreview').innerText;
    const saveToDb = document.getElementById('saveToDb').checked;

    if (!phone) return showToast("Please enter a phone number", "bg-red-500");

    const btn = document.getElementById('sendSmsBtn');
    btn.disabled = true;
    btn.innerText = "Sending...";

    // 1. Save new customer if requested
    if (!selectedCustomerId && saveToDb && name) {
        await _supabase.from('customers').insert([{ phone, first_name: name }]);
    }

    // 2. Trigger SMS (Helper from Phase 2)
    const result = await triggerSMS(phone, message, 'served');

    btn.disabled = false;
    btn.innerHTML = `<i class="fas fa-paper-plane"></i> <span>Send SMS Now</span>`;

    if (result.success) {
        showToast("Message Sent Successfully!");
        document.getElementById('servePhone').value = "";
        document.getElementById('serveName').value = "";
        document.getElementById('customText').value = "";
        updatePreview();
    } else {
        showToast("Failed to send: " + (result.error || "Arkesel Error"), "bg-red-500");
    }
}

function showToast(msg, colorClass = "bg-[#d4af37]") {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = `fixed bottom-8 right-8 ${colorClass} text-black px-6 py-3 rounded-lg shadow-2xl font-bold transition-all duration-300 z-[100] translate-y-0 opacity-100`;
    setTimeout(() => {
        t.classList.add('translate-y-20', 'opacity-0');
    }, 4000);
}

// --- Logic: Insert variable at cursor position ---
function insertVariable(textareaId, variable) {
    const textarea = document.getElementById(textareaId);
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;

    // Insert the variable string at the cursor position
    textarea.value = text.substring(0, start) + variable + text.substring(end);

    // Move cursor to after the inserted variable
    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = start + variable.length;

    // Trigger the preview update
    updatePreview();
}