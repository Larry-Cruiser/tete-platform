// Admin API Client
const ADMIN_API_BASE = '/api/admin';

// Get admin token from localStorage
function getAdminToken() {
    return localStorage.getItem('tete_admin_token');
}

// Admin API request helper
async function adminRequest(endpoint, options = {}) {
    const token = getAdminToken();
    
    const config = {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
            ...options.headers
        }
    };

    try {
        const response = await fetch(`${ADMIN_API_BASE}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Request failed');
        }

        return data;
    } catch (error) {
        console.error('Admin API error:', error);
        throw error;
    }
}

// Admin API methods
const adminApi = {
    // Get dashboard stats
    getDashboardStats: () => adminRequest('/dashboard/stats'),
    
    // Get users
    getUsers: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return adminRequest(`/users?${queryString}`);
    }
};
// Find the last function in your adminApi.js file, then ADD these after it:

// Get dispute statistics
adminApi.getDisputeStats = async function() {
    try {
        const response = await fetch('/api/admin/disputes/stats', {
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch dispute stats');
        return await response.json();
    } catch (error) {
        console.error('Get dispute stats error:', error);
        // Return default stats instead of throwing
        return {
            pending: 0,
            inReview: 0,
            resolvedToday: 0,
            resolutionRate: 0,
            avgResolutionTime: '0m'
        };
    }
};

// Get disputes
adminApi.getDisputes = async function(params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const response = await fetch(`/api/admin/disputes?${queryString}`, {
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch disputes');
        return await response.json();
    } catch (error) {
        console.error('Get disputes error:', error);
        return { disputes: [] };
    }
};

// Resolve dispute
adminApi.resolveDispute = async function(disputeId, data) {
    const response = await fetch(`/api/admin/disputes/${disputeId}/resolve`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getAdminToken()}`
        },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to resolve dispute');
    }
    
    return await response.json();
};

// Get wager stats (if not already added)
adminApi.getWagerStats = adminApi.getWagerStats || async function() {
    try {
        const response = await fetch('/api/admin/wagers/stats', {
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            }
        });
        
        if (!response.ok) throw new Error('Failed to fetch wager stats');
        return await response.json();
    } catch (error) {
        console.error('Get wager stats error:', error);
        return {
            total: 0,
            active: 0,
            open: 0,
            disputed: 0,
            totalValue: 0
        };
    }
};

// Export for use in admin pages
window.adminApi = adminApi;
