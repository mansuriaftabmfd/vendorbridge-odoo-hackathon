/**
 * API Client for VendorBridge Backend
 * Handles HTTP requests to the Express.js backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Request configuration
interface ApiRequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: HeadersInit;
  body?: any;
  credentials?: RequestCredentials;
}

// API Response type
interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
}

// Custom API Error class
class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Base API request function
 */
async function apiRequest<T = any>(
  endpoint: string,
  config: ApiRequestConfig = {}
): Promise<ApiResponse<T>> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const requestConfig: RequestInit = {
    method: config.method || 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...config.headers,
    },
    credentials: 'include', // Important for session cookies
    ...config,
  };

  // Add body for non-GET requests
  if (config.body && config.method !== 'GET') {
    requestConfig.body = JSON.stringify(config.body);
  }

  try {
    const response = await fetch(url, requestConfig);
    
    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    let data: any;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // Handle non-JSON responses (like file downloads)
      data = { success: response.ok };
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        data.error || `HTTP error ${response.status}`,
        data.code
      );
    }

    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors
    throw new ApiError(0, 'Network error or server unavailable');
  }
}

// API methods
export const api = {
  // Authentication
  auth: {
    register: (userData: {
      email: string;
      password: string;
      full_name: string;
      role: string;
      organization?: any;
      organization_id?: string;
    }) => apiRequest('/api/auth/register', { method: 'POST', body: userData }),

    login: (credentials: { email: string; password: string; remember_me?: boolean }) =>
      apiRequest('/api/auth/login', { method: 'POST', body: credentials }),

    logout: () => apiRequest('/api/auth/logout', { method: 'POST' }),

    getProfile: () => apiRequest('/api/auth/me'),

    forgotPassword: (email: string) =>
      apiRequest('/api/auth/forgot-password', { method: 'POST', body: { email } }),

    resetPassword: (token: string, password: string, confirm_password: string) =>
      apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: { token, password, confirm_password },
      }),

    changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) =>
      apiRequest('/api/auth/change-password', {
        method: 'POST',
        body: {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        },
      }),

    verifyEmail: (token: string) =>
      apiRequest('/api/auth/verify-email', { method: 'POST', body: { token } }),

    resendVerification: (email: string) =>
      apiRequest('/api/auth/resend-verification', { method: 'POST', body: { email } }),

    getSession: () => apiRequest('/api/auth/session'),
  },

  // Users
  users: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/users${queryString}`);
    },
    getById: (id: string) => apiRequest(`/api/users/${id}`),
    update: (id: string, userData: any) => 
      apiRequest(`/api/users/${id}`, { method: 'PUT', body: userData }),
    delete: (id: string) => apiRequest(`/api/users/${id}`, { method: 'DELETE' }),
  },

  // Vendors
  vendors: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/vendors${queryString}`);
    },
    getById: (id: string) => apiRequest(`/api/vendors/${id}`),
    create: (vendorData: any) => 
      apiRequest('/api/vendors', { method: 'POST', body: vendorData }),
    update: (id: string, vendorData: any) => 
      apiRequest(`/api/vendors/${id}`, { method: 'PUT', body: vendorData }),
    delete: (id: string) => apiRequest(`/api/vendors/${id}`, { method: 'DELETE' }),
  },

  // RFQs
  rfqs: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/rfqs${queryString}`);
    },
    getById: (id: string) => apiRequest(`/api/rfqs/${id}`),
    create: (rfqData: any) => 
      apiRequest('/api/rfqs', { method: 'POST', body: rfqData }),
    update: (id: string, rfqData: any) => 
      apiRequest(`/api/rfqs/${id}`, { method: 'PUT', body: rfqData }),
    delete: (id: string) => apiRequest(`/api/rfqs/${id}`, { method: 'DELETE' }),
    send: (id: string) => apiRequest(`/api/rfqs/${id}/send`, { method: 'POST' }),
    close: (id: string) => apiRequest(`/api/rfqs/${id}/close`, { method: 'POST' }),
  },

  // Quotations
  quotations: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/quotations${queryString}`);
    },
    getById: (id: string) => apiRequest(`/api/quotations/${id}`),
    create: (quotationData: any) => 
      apiRequest('/api/quotations', { method: 'POST', body: quotationData }),
    update: (id: string, quotationData: any) => 
      apiRequest(`/api/quotations/${id}`, { method: 'PUT', body: quotationData }),
    submit: (id: string) => apiRequest(`/api/quotations/${id}/submit`, { method: 'POST' }),
    select: (id: string) => apiRequest(`/api/quotations/${id}/select`, { method: 'POST' }),
  },

  // Approvals
  approvals: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/approvals${queryString}`);
    },
    getById: (id: string) => apiRequest(`/api/approvals/${id}`),
    approve: (id: string, remarks?: string) => 
      apiRequest(`/api/approvals/${id}/approve`, { method: 'POST', body: { remarks } }),
    reject: (id: string, remarks: string) => 
      apiRequest(`/api/approvals/${id}/reject`, { method: 'POST', body: { remarks } }),
    requestChanges: (id: string, remarks: string) => 
      apiRequest(`/api/approvals/${id}/request-changes`, { method: 'POST', body: { remarks } }),
  },

  // Purchase Orders
  pos: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/pos${queryString}`);
    },
    getById: (id: string) => apiRequest(`/api/pos/${id}`),
    create: (poData: any) => 
      apiRequest('/api/pos', { method: 'POST', body: poData }),
    update: (id: string, poData: any) => 
      apiRequest(`/api/pos/${id}`, { method: 'PUT', body: poData }),
    approve: (id: string) => apiRequest(`/api/pos/${id}/approve`, { method: 'POST' }),
    send: (id: string) => apiRequest(`/api/pos/${id}/send`, { method: 'POST' }),
    getPDF: (id: string) => apiRequest(`/api/pos/${id}/pdf`),
  },

  // Invoices
  invoices: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/invoices${queryString}`);
    },
    getById: (id: string) => apiRequest(`/api/invoices/${id}`),
    send: (id: string) => apiRequest(`/api/invoices/${id}/send`, { method: 'POST' }),
    getPDF: (id: string) => apiRequest(`/api/invoices/${id}/pdf`),
    markPaid: (id: string) => apiRequest(`/api/invoices/${id}/mark-paid`, { method: 'POST' }),
  },

  // Notifications
  notifications: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/notifications${queryString}`);
    },
    markAsRead: (id: string) => 
      apiRequest(`/api/notifications/${id}/read`, { method: 'PUT' }),
    markAllAsRead: () => 
      apiRequest('/api/notifications/read-all', { method: 'PUT' }),
    getUnreadCount: () => apiRequest('/api/notifications/unread-count'),
    delete: (id: string) => apiRequest(`/api/notifications/${id}`, { method: 'DELETE' }),
  },

  // Activity Logs
  activity: {
    getAll: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/activity-logs${queryString}`);
    },
    getByUser: (userId: string, params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/activity-logs/user/${userId}${queryString}`);
    },
    getByEntity: (entityType: string, entityId: string, params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/activity-logs/entity/${entityType}/${entityId}${queryString}`);
    },
  },

  // Reports
  reports: {
    spending: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/reports/spending${queryString}`);
    },
    vendorPerformance: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/reports/vendor-performance${queryString}`);
    },
    procurementTrends: (params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/reports/procurement-trends${queryString}`);
    },
    export: (reportType: string, params?: Record<string, any>) => {
      const queryString = params ? `?${new URLSearchParams(params).toString()}` : '';
      return apiRequest(`/api/reports/export/${reportType}${queryString}`);
    },
  },

  // Utility
  health: () => apiRequest('/health'),
};

export { ApiError };
export type { ApiResponse };