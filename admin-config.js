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