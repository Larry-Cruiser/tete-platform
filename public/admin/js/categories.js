// Centralized wager categories
const WAGER_CATEGORIES = {
    football: {
        id: 'football',
        name: 'Football',
        icon: '⚽',
        description: 'Football matches and tournaments'
    },
    basketball: {
        id: 'basketball',
        name: 'Basketball',
        icon: '🏀',
        description: 'Basketball games and competitions'
    },
    politics: {
        id: 'politics',
        name: 'Politics',
        icon: '🏛️',
        description: 'Political events and elections'
    },
    entertainment: {
        id: 'entertainment',
        name: 'Entertainment',
        icon: '🎬',
        description: 'Movies, music, and celebrity events'
    },
    crypto: {
        id: 'crypto',
        name: 'Crypto',
        icon: '₿',
        description: 'Cryptocurrency predictions'
    },
    custom: {
        id: 'custom',
        name: 'Custom',
        icon: '🎯',
        description: 'User-created custom wagers'
    }
};

// Get all categories as array
function getAllCategories() {
    return Object.values(WAGER_CATEGORIES);
}

// Get category by ID
function getCategoryById(id) {
    return WAGER_CATEGORIES[id] || WAGER_CATEGORIES.custom;
}

// Get category name by ID
function getCategoryName(id) {
    return WAGER_CATEGORIES[id]?.name || 'Custom';
}

// Export for use in other files
window.wagerCategories = {
    WAGER_CATEGORIES,
    getAllCategories,
    getCategoryById,
    getCategoryName
};