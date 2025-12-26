let smsSettings = {};
let targetRecipients = []; // Stores unique standardized numbers

document.addEventListener('DOMContentLoaded', async () => {
    const user = await checkAuth();
    if (!user) return;

    // RBAC: Strict Superadmin check
    const { data: profile } = await _supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'superadmin') {
        alert("Restricted Area: Superadmins Only.");
        window.location.href = 'dashboard.html';
        return;
    }

    // Load Settings
    const { data } = await _supabase.from('sms_settings').select('*');
    data.forEach(s => smsSettings[s.key_name] = s.value);

    updatePromoPreview();
});

async function calculateAudience() {
    const monthFilter = document.getElementById('filterMonth').value; // YYYY-MM
    const manualInput = document.getElementById('manualNumbers').value;

    let dbNumbers = [];

    // 1. Fetch from Database if filter set
    if (monthFilter) {
        const startOfMonth = `${monthFilter}-01T00:00:00Z`;
        const dateObj = new Date(monthFilter + '-01');
        const endOfMonth = new Date(dateObj.getFullYear(), dateObj.getMonth() + 1, 0, 23, 59, 59).toISOString();

        const { data } = await _supabase
            .from('customers')
            .select('phone')
            .gte('created_at', startOfMonth)
            .lte('created_at', endOfMonth);

        if (data) dbNumbers = data.map(c => c.phone);
    }

    // 2. Parse Manual Input
    const manualNumbers = manualInput.split(',')
        .map(n => standardizePhone(n.trim()))
        .filter(n => n.length >= 10);

    // 3. De-duplicate using Set
    const uniqueNumbers = new Set([...dbNumbers, ...manualNumbers]);
    targetRecipients = Array.from(uniqueNumbers);

    document.getElementById('targetCounter').innerText = `${targetRecipients.length} Recipients Selected`;
    document.getElementById('sendBulkBtn').disabled = targetRecipients.length === 0;
}

function updatePromoPreview() {
    const text = document.getElementById('promoText').value;
    let message = text.replace('{{first_name}}', smsSettings.fallback_name);

    if (document.getElementById('promoWebsite').checked) message += `\nVisit: ${smsSettings.website_link}`;
    if (document.getElementById('promoReview').checked) message += `\nReview: ${smsSettings.review_link}`;

    document.getElementById('promoPreview').innerText = message;

    const len = message.length;
    const segments = Math.ceil(len / 160);
    document.getElementById('promoCharCount').innerText = `${len} characters (${segments} segment${segments > 1 ? 's' : ''})`;
}

async function handleSendBulk() {
    if (targetRecipients.length === 0) return;
    if (!confirm(`Are you sure you want to blast this message to ${targetRecipients.length} customers?`)) return;

    const baseMessage = document.getElementById('promoText').value;
    const includeWeb = document.getElementById('promoWebsite').checked;
    const includeRev = document.getElementById('promoReview').checked;

    const btn = document.getElementById('sendBulkBtn');
    const progressArea = document.getElementById('progressArea');
    const progressBar = document.getElementById('progressBar');
    const progressStatus = document.getElementById('progressStatus');

    btn.disabled = true;
    progressArea.classList.remove('hidden');

    let sentCount = 0;

    // Loop through recipients and trigger SMS
    for (const phone of targetRecipients) {
        // Fetch first name for personalization if in DB
        const { data: customer } = await _supabase.from('customers').select('first_name').eq('phone', phone).maybeSingle();
        const fName = customer?.first_name || smsSettings.fallback_name;

        // Build personalized message
        let finalMsg = baseMessage.replace('{{first_name}}', fName);
        if (includeWeb) finalMsg += `\nVisit: ${smsSettings.website_link}`;
        if (includeRev) finalMsg += `\nReview: ${smsSettings.review_link}`;

        await triggerSMS(phone, finalMsg, 'promotional');

        sentCount++;
        const percent = Math.round((sentCount / targetRecipients.length) * 100);
        progressBar.style.width = `${percent}%`;
        progressStatus.innerText = `Sending ${sentCount} of ${targetRecipients.length}...`;
    }

    showToast(`Bulk blast complete! ${sentCount} messages queued.`);
    setTimeout(() => location.reload(), 3000);
}

function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerText = msg;
    t.className = `fixed bottom-8 right-8 bg-[#d4af37] text-black px-6 py-3 rounded-lg shadow-2xl font-bold transition-all duration-300 z-[100] translate-y-0 opacity-100`;
    setTimeout(() => { t.classList.add('translate-y-20', 'opacity-0'); }, 4000);
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
    updatePromoPreview();
}