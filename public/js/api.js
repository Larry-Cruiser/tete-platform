// Tété API Handler
const API_BASE = '/api';

class TeteAPI {
    constructor() {
        this.token = localStorage.getItem('tete_token');
        this.user = null;
        this.loadUser();
    }

    // Set auth token
    setToken(token) {
        this.token = token;
        localStorage.setItem('tete_token', token);
    }

    // Clear auth
    logout() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('tete_token');
        localStorage.removeItem('tete_user');
        window.location.href = '/';
    }

    // Load user from storage
    loadUser() {
        const userData = localStorage.getItem('tete_user');
        if (userData) {
            this.user = JSON.parse(userData);
        }
    }

    // Save user to storage
    saveUser(user) {
        this.user = user;
        localStorage.setItem('tete_user', JSON.stringify(user));
    }

    // API request helper
    async request(endpoint, options = {}) {
        const url = `${API_BASE}${endpoint}`;
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth endpoints
    async register(userData) {
        const data = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        return data;
    }

    async login(credentials) {
        const data = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
        
        if (data.token) {
            this.setToken(data.token);
            this.saveUser(data.user);
        }
        
        return data;
    }

    async verifyEmail(token) {
        return await this.request('/auth/verify-email', {
            method: 'POST',
            body: JSON.stringify({ token })
        });
    }

    async updateProfile(profileData) {
        const data = await this.request('/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
        
        if (data.user) {
            this.saveUser(data.user);
        }
        
        return data;
    }

    // Wallet endpoints
    async getWalletBalance() {
        return await this.request('/wallet/balance');
    }

    async initiateDeposit(amount) {
        return await this.request('/wallet/deposit', {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
    }

    async verifyDeposit(reference) {
        return await this.request('/wallet/verify-deposit', {
            method: 'POST',
            body: JSON.stringify({ reference })
        });
    }

    async initiateWithdrawal(amount) {
        return await this.request('/wallet/withdraw', {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
    }

    async getTransactions(page = 1, limit = 20) {
        return await this.request(`/wallet/transactions?page=${page}&limit=${limit}`);
    }

    // Wager endpoints
    async createWager(wagerData) {
        return await this.request('/wagers/create', {
            method: 'POST',
            body: JSON.stringify(wagerData)
        });
    }

    async getWagers(params = {}) {
        const query = new URLSearchParams(params).toString();
        return await this.request(`/wagers/public?${query}`);
    }

    async getMyWagers(status = null, page = 1) {
        let url = `/wagers/my-wagers?page=${page}`;
        if (status) url += `&status=${status}`;
        return await this.request(url);
    }

    async joinWager(wagerId, joinerPrediction = null) {
        return await this.request(`/wagers/${wagerId}/join`, {
            method: 'POST',
            body: JSON.stringify({ joinerPrediction })
        });
    }

    async approveJoiner(wagerId, approve) {
        return await this.request(`/wagers/${wagerId}/approve`, {
            method: 'POST',
            body: JSON.stringify({ approve })
        });
    }

    async submitOutcome(wagerId, outcomeData) {
        return await this.request(`/wagers/${wagerId}/outcome`, {
            method: 'POST',
            body: JSON.stringify(outcomeData)
        });
    }

    async cancelWager(wagerId) {
        return await this.request(`/wagers/${wagerId}/cancel`, {
            method: 'POST'
        });
    }

    async getWagerDetails(wagerId) {
        return await this.request(`/wagers/details/${wagerId}`);
    }

    // Chat endpoints
    async sendMessage(wagerId, message) {
        return await this.request(`/chat/${wagerId}/send`, {
            method: 'POST',
            body: JSON.stringify({ message })
        });
    }

    async getMessages(wagerId, page = 1) {
        return await this.request(`/chat/${wagerId}/messages?page=${page}`);
    }

    // General endpoints
    async getCategories() {
        return await this.request('/general/categories');
    }

    async getBanks() {
        return await this.request('/general/banks');
    }

    async getStats() {
        return await this.request('/general/stats');
    }
}

// Create global instance
const teteAPI = new TeteAPI();

// Utility functions
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">
            <span class="toast-icon">${getToastIcon(type)}</span>
            <span class="toast-message">${message}</span>
        </div>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function getToastIcon(type) {
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    return icons[type] || icons.info;
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-NG', {
        style: 'currency',
        currency: 'NGN'
    }).format(amount);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('en-NG', {
        dateStyle: 'medium',
        timeStyle: 'short'
    }).format(new Date(date));
}

function getTimeRemaining(endtime) {
    const total = Date.parse(endtime) - Date.parse(new Date());
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    
    return {
        total,
        days,
        hours,
        minutes,
        seconds
    };
}

function initializeCountdown(element, endtime) {
    function updateClock() {
        const t = getTimeRemaining(endtime);
        
        if (t.total <= 0) {
            clearInterval(timeinterval);
            element.innerHTML = 'EXPIRED';
            element.classList.add('expired');
            return;
        }
        
        element.innerHTML = `${t.days}d ${t.hours}h ${t.minutes}m ${t.seconds}s`;
    }
    
    updateClock();
    const timeinterval = setInterval(updateClock, 1000);
    return timeinterval;
}

// Check auth on protected pages
function requireAuth() {
    if (!teteAPI.token || !teteAPI.user) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// Check profile completion
function requireCompleteProfile() {
    if (!requireAuth()) return false;
    
    if (!teteAPI.user.profile_completed) {
        window.location.href = '/complete-profile.html';
        return false;
    }
    return true;
}
// ============================================
// WAGER CATEGORIES - Complete Configuration
// ============================================
window.WAGER_CATEGORIES = {
    football: {
        name: 'Football',
        icon: '⚽',
        subcategories: {
            nigerian_football: 'Nigerian Football',
            european_football: 'European Football',
            african_football: 'African Football',
            others: 'Others'
        }
    },
    politics: {
        name: 'Politics',
        icon: '🏛️',
        subcategories: {
            nigerian_politics: 'Nigerian Politics',
            international_politics: 'International Politics',
            us_politics: 'US Politics',
            others: 'Others'
        }
    },
    basketball: {
        name: 'Basketball',
        icon: '🏀',
        subcategories: {
            nba: 'NBA',
            african_basketball: 'African Basketball',
            european_basketball: 'European Basketball',
            others: 'Others'
        }
    },
    entertainment: {
        name: 'Entertainment',
        icon: '🎬',
        subcategories: {
            nollywood: 'Nollywood',
            hollywood: 'Hollywood',
            music_awards: 'Music Awards',
            others: 'Others'
        }
    },
    esports: {
        name: 'Esports',
        icon: '🎮',
        subcategories: {
            fifa: 'FIFA',
            call_of_duty: 'Call of Duty',
            league_of_legends: 'League of Legends',
            others: 'Others'
        }
    },
    combat_sports: {
        name: 'Combat Sports',
        icon: '🥊',
        subcategories: {
            boxing: 'Boxing',
            ufc: 'UFC',
            wrestling: 'Wrestling',
            others: 'Others'
        }
    },
    reality_tv: {
        name: 'Reality TV',
        icon: '📺',
        subcategories: {
            big_brother: 'Big Brother',
            talent_shows: 'Talent Shows',
            awards_shows: 'Awards Shows',
            others: 'Others'
        }
    },
    current_events: {
        name: 'Current Events',
        icon: '📰',
        subcategories: {
            global_news: 'Global News',
            local_news: 'Local News',
            trending_topics: 'Trending Topics',
            others: 'Others'
        }
    },
    tech: {
        name: 'Tech',
        icon: '💻',
        subcategories: {
            product_launches: 'Product Launches',
            startup_competitions: 'Startup Competitions',
            tech_trends: 'Tech Trends',
            others: 'Others'
        }
    },
    custom: {
        name: 'Custom',
        icon: '🎯',
        subcategories: {
            unique_bets: 'Unique Bets',
            personal_challenges: 'Personal Challenges',
            miscellaneous: 'Miscellaneous',
            others: 'Others'
        }
    }
};

// Helper functions
window.getCategoryName = function(categoryId) {
    return window.WAGER_CATEGORIES[categoryId]?.name || 'Custom';
};

window.getCategoryIcon = function(categoryId) {
    return window.WAGER_CATEGORIES[categoryId]?.icon || '🎯';
};

window.getSubcategoryName = function(categoryId, subcategoryId) {
    return window.WAGER_CATEGORIES[categoryId]?.subcategories[subcategoryId] || 'Others';
};

window.getAllCategories = function() {
    return Object.entries(window.WAGER_CATEGORIES).map(([id, data]) => ({
        id: id,
        name: data.name,
        icon: data.icon
    }));
};

window.getSubcategories = function(categoryId) {
    const category = window.WAGER_CATEGORIES[categoryId];
    if (!category) return [];
    
    return Object.entries(category.subcategories).map(([id, name]) => ({
        id: id,
        name: name
    }));
};

// Get full category display (e.g., "Football - Nigerian Football")
window.getFullCategoryName = function(categoryId, subcategoryId) {
    const categoryName = getCategoryName(categoryId);
    const subcategoryName = getSubcategoryName(categoryId, subcategoryId);
    return subcategoryId && subcategoryId !== 'others' 
        ? `${categoryName} - ${subcategoryName}`
        : categoryName;
};

// Load categories from database
window.loadCategories = async function() {
    try {
        const response = await fetch('/api/general/categories');
        const data = await response.json();
        
        // Store in a global variable
        window.DB_CATEGORIES = data.categories;
        
        // Create lookup objects for easy access
        window.CATEGORY_LOOKUP = {};
        window.SUBCATEGORY_LOOKUP = {};
        
        data.categories.forEach(cat => {
            window.CATEGORY_LOOKUP[cat.id] = cat;
            cat.subcategories.forEach(sub => {
                window.SUBCATEGORY_LOOKUP[sub.id] = sub;
            });
        });
        
        return data.categories;
    } catch (error) {
        console.error('Failed to load categories:', error);
        return [];
    }
};

// Helper to get category by ID
window.getCategoryById = function(categoryId) {
    return window.CATEGORY_LOOKUP?.[categoryId] || null;
};

// Helper to get subcategory by ID
window.getSubcategoryById = function(subcategoryId) {
    return window.SUBCATEGORY_LOOKUP?.[subcategoryId] || null;
};

// Get category name by ID
window.getCategoryName = function(categoryId) {
    return window.CATEGORY_LOOKUP?.[categoryId]?.name || 'Unknown';
};

// Get subcategory name by ID  
window.getSubcategoryName = function(subcategoryId) {
    return window.SUBCATEGORY_LOOKUP?.[subcategoryId]?.name || 'Unknown';
};