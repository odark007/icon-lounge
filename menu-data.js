// menu-data.js
const menuData = {
    categories: [
        {
            id: "food",
            name: "Food",
            specialOffer: "10% off all platters on Fridays",
            showOffer: false,
            subCategories: [
                {
                    id: "grills",
                    name: "From the Grill",
                    specialOffer: "Free extra side with Large Tilapia",
                    items: [
                        {
                            id: 1,
                            name: "Grilled Tilapia",
                            description: "Fresh local tilapia grilled with signature spices, served with banku or yam chips.",
                            image: "images/tilapia.jpg", // can be null
                            prices: { small: 60, medium: 85, large: 120 },
                            featured: true
                        }
                    ]
                }
            ]
        },
        {
            id: "drinks",
            name: "Drinks",
            subCategories: [
                {
                    id: "cocktails",
                    name: "Signature Cocktails",
                    items: [
                        {
                            id: 101,
                            name: "Icon Sunset",
                            description: "Rum, pineapple juice, and grenadine.",
                            image: null,
                            prices: { medium: 45 },
                            featured: true
                        }
                    ]
                }
            ]
        }
    ]
};

const deliveryPartners = [
    { name: "Glovo", link: "https://glovoapp.com/...", logo: "images/glovo-logo.png" },
    { name: "Bolt Food", link: "https://food.bolt.eu/...", logo: "images/bolt-logo.png" }
];

const placeholderImage = "images/logo-placeholder.png";


// --- Business Contact Info ---
const contactInfo = {
    whatsapp: "233240452792", // International format without +
    region: "Accra, Ghana"
};