const SUPABASE_URL = 'https://vzhimienbxsmtosiqvcu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aGltaWVuYnhzbXRvc2lxdmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTU2NDgsImV4cCI6MjA4MjE3MTY0OH0.SWUi6K7Kbn7bLWECf8W4Aq4MP0LhsdS8XJkEA95tNCw'; // Use your actual key
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAuth() {
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
        return null;
    }
    return session.user;
}


// --- Global Utilities ---
function standardizePhone(phone) {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, ''); // Remove non-digits
    if (clean.startsWith('0')) clean = '233' + clean.substring(1);
    if (clean.length === 9) clean = '233' + clean;
    return clean;
}

// --- Global UI Logic: Mobile Sidebar Toggle ---
window.toggleSidebar = function () {
    const sidebar = document.getElementById('sidebar');
    const backdrop = document.getElementById('sidebarBackdrop');

    if (!sidebar || !backdrop) return;

    // Toggle the classes to slide the sidebar in/out
    if (sidebar.classList.contains('-translate-x-full')) {
        sidebar.classList.remove('-translate-x-full');
        sidebar.classList.add('translate-x-0');
        backdrop.classList.remove('hidden');
    } else {
        sidebar.classList.remove('translate-x-0');
        sidebar.classList.add('-translate-x-full');
        backdrop.classList.add('hidden');
    }
};