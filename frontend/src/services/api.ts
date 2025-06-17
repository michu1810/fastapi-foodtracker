import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Dodanie tokena do każdego requestu
apiClient.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Obsługa refresh tokenów
apiClient.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    const url = originalRequest?.url?.toString() || '';

    const skipRefresh =
      url.includes('/auth/login') ||
      url.includes('/auth/register') ||
      url.includes('/auth/refresh');

    if (error.response?.status === 401 && !originalRequest._retry && !skipRefresh) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post<{ access_token: string }>(
          `${API_BASE_URL}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newAccessToken = refreshResponse.data.access_token;
        localStorage.setItem('token', newAccessToken);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${newAccessToken}`;
        originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;

        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Refresh token failed:", refreshError);
        localStorage.removeItem('token');
        delete apiClient.defaults.headers.common['Authorization'];
        // Przekierowanie na stronę logowania, jeśli odświeżenie się nie powiedzie
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Dodatkowe helpery
type VerifyStatus = 'success' | 'used' | 'expired' | 'invalid';

export const verifyAccount = async (
  token: string
): Promise<{ status: VerifyStatus }> => {
  const response = await apiClient.get('/auth/verify', {
    params: { token }
  });
  return response.data;
};

export const forgotPasswordRequest = (email: string) => {
  return apiClient.post('/auth/request-password-reset', { email });
};

export const resetPassword = (token: string, new_password: string) => {
  return apiClient.post('/auth/reset-password', {
    token,
    new_password,
  });
};

export default apiClient;
