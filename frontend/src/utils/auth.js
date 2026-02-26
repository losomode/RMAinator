const AUTH_TOKEN_KEY = 'auth_token';
const AUTHINATOR_URL = 'http://localhost:3000';

export const getToken = () => {
  return localStorage.getItem(AUTH_TOKEN_KEY);
};

export const setToken = (token) => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
};

export const clearToken = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  // Also clear old auth tokens if they exist
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('user');
};

export const redirectToLogin = () => {
  const currentUrl = window.location.href;
  window.location.href = `${AUTHINATOR_URL}/login?redirect=${encodeURIComponent(currentUrl)}`;
};

export const redirectToServices = () => {
  window.location.href = AUTHINATOR_URL;
};

export const handleLogout = () => {
  clearToken();
  redirectToLogin();
};
