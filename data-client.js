// data-client.js
const SUPABASE_URL = 'https://vzhimienbxsmtosiqvcu.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6aGltaWVuYnhzbXRvc2lxdmN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY1OTU2NDgsImV4cCI6MjA4MjE3MTY0OH0.SWUi6K7Kbn7bLWECf8W4Aq4MP0LhsdS8XJkEA95tNCw';
const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Global variables to replace menu-data.js content
let menuData = { categories: [] };
const placeholderImage = "images/logo-placeholder.png";
const deliveryPartners = [
    { name: "Glovo", link: "#", logo: "images/glovo-logo.png" },
    { name: "Bolt Food", link: "#", logo: "images/bolt-logo.png" }
];
const contactInfo = { whatsapp: "233240452792", region: "Accra, Ghana" };

async function fetchMenuFromSupabase() {
    // Relational query: Category -> SubCategories -> Items
    const { data, error } = await _supabase
        .from('categories')
        .select(`
            id, name, special_offer, show_offer,
            sub_categories (
                id, name, special_offer,
                items (
                    id, name, description, image_url, prices, featured,
                    is_special, special_text, discount_percent, 
                    special_start, special_end, special_days,
                    is_available
                )
            )
        `);

    if (error) {
        console.error("Error fetching menu:", error);
        return;
    }

    // Map Supabase structure to our exact JS object structure
    menuData.categories = data.map(cat => ({
        id: cat.id,
        name: cat.name,
        specialOffer: cat.special_offer,
        showOffer: cat.show_offer,
        // Ensure this key is exactly "subCategories"
        subCategories: (cat.sub_categories || []).map(sub => ({
            id: sub.id,
            name: sub.name,
            specialOffer: sub.special_offer,
            // Only include items that are marked as available
            items: (sub.items || [])
                .filter(item => item.is_available === true)
                .map(item => ({
                    id: item.id,
                    name: item.name,
                    description: item.description,
                    image: item.image_url,
                    prices: item.prices,
                    featured: item.featured,
                    isSpecial: item.is_special,
                    specialText: item.special_text,
                    discount: item.discount_percent,
                    specialStart: item.special_start,
                    specialEnd: item.special_end,
                    specialDays: item.special_days || []
                }))
        }))
    }));

    // Dispatch custom event to tell index.html/menu.html that data is ready
    window.dispatchEvent(new CustomEvent('menuDataLoaded'));
}

fetchMenuFromSupabase();