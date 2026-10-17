const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Request failed');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }

  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  post(endpoint, data) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { 
      method: 'POST', 
      body 
    });
  }

  put(endpoint, data) {
    const body = data instanceof FormData ? data : JSON.stringify(data);
    return this.request(endpoint, { 
      method: 'PUT', 
      body 
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient();

// Specific API endpoints
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (data) => api.post('/auth/register', data),
  profile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  updateContractor: (data) => api.put('/auth/profile/contractor', data),
  changePassword: (data) => api.put('/auth/profile/password', data),
  uploadDoc: (formData) => api.post('/auth/profile/upload-doc', formData),
  getApprovalRequests: () => api.get('/auth/approval-requests'),
  approveUser: (userId, notes = 'Authorized by Administrator') => api.post(`/auth/approve-user/${userId}`, { notes }),
  rejectUser: (userId, notes = 'Verification details do not match official registry.') => api.post(`/auth/reject-user/${userId}`, { notes }),
};

export const tendersAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/tenders${query ? `?${query}` : ''}`);
  },
  getById: (id) => api.get(`/tenders/${id}`),
  create: (data) => api.post('/tenders', data),
  update: (id, data) => api.put(`/tenders/${id}`, data),
  award: (id, bidId) => api.post(`/tenders/${id}/award`, { bidId }),
};

export const bidsAPI = {
  create: (data) => api.post('/bids', data),
  getByTender: (tenderId) => api.get(`/bids/tender/${tenderId}`),
  compare: (tenderId) => api.get(`/bids/tender/${tenderId}/compare`),
};

export const contractorsAPI = {
  getAll: () => api.get('/contractors'),
  verify: (id, status) => api.put(`/contractors/${id}/verify`, { status }),
  uploadDocs: (formData) => api.put('/contractors/upload-docs', formData),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getMyDashboard: () => api.get('/dashboard/my-dashboard'),
};

export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getById: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.put(`/projects/${id}`, data),
  getStats: () => api.get('/projects/stats/overview'),
};

export const paymentsAPI = {
  getAll: () => api.get('/payments'),
  getById: (id) => api.get(`/payments/${id}`),
  getStats: () => api.get('/payments/stats/overview'),
  request: (data) => api.post('/payments/request', data),
  engineerApprove: (id, data) => api.put(`/payments/${id}/engineer-approve`, data),
  financeApprove: (id, data) => api.put(`/payments/${id}/finance-approve`, data),
  reject: (id, data) => api.put(`/payments/${id}/reject`, data),
  payOnline: (id, data) => api.post(`/payments/${id}/pay-online`, data),
  getInvoice: (id) => api.get(`/payments/${id}/invoice`),
};

export const materialsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/materials${query ? `?${query}` : ''}`);
  },
  getById: (id) => api.get(`/materials/${id}`),
  getStats: () => api.get('/materials/stats/overview'),
  create: (data) => api.post('/materials', data),
  update: (id, data) => api.put(`/materials/${id}`, data),
  delete: (id) => api.delete(`/materials/${id}`),
  consume: (id, data) => api.post(`/materials/${id}/consume`, data),
  restock: (id, data) => api.post(`/materials/${id}/restock`, data),
};

export const inspectionsAPI = {
  getAll: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return api.get(`/inspections${query ? `?${query}` : ''}`);
  },
  getById: (id) => api.get(`/inspections/${id}`),
  getStats: () => api.get('/inspections/stats/overview'),
  create: (data) => api.post('/inspections', data),
  update: (id, data) => api.put(`/inspections/${id}`, data),
  uploadMedia: (id, formData) => api.post(`/inspections/${id}/media`, formData),
  generateReport: (id) => api.post(`/inspections/${id}/generate-report`),
};

export const aiChatAPI = {
  send: (data) => api.post('/ai-chat/send', data),
  history: (sessionId) => api.get(`/ai-chat/history/${sessionId}`),
  clearSession: (sessionId) => api.delete(`/ai-chat/session/${sessionId}`),
  recommendTenders: () => api.post('/ai-chat/recommend-tenders'),
};

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
};
