import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getToken, setToken, clearToken, redirectToLogin, redirectToServices, handleLogout } from './auth';

describe('auth utils', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getToken', () => {
    it('should return null when no token stored', () => {
      expect(getToken()).toBeNull();
    });

    it('should return stored token', () => {
      localStorage.setItem('auth_token', 'test-token');
      expect(getToken()).toBe('test-token');
    });
  });

  describe('setToken', () => {
    it('should store token in localStorage', () => {
      setToken('my-token');
      expect(localStorage.getItem('auth_token')).toBe('my-token');
    });
  });

  describe('clearToken', () => {
    it('should remove auth_token and legacy keys', () => {
      localStorage.setItem('auth_token', 'tok');
      localStorage.setItem('accessToken', 'at');
      localStorage.setItem('refreshToken', 'rt');
      localStorage.setItem('user', '{}');

      clearToken();

      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(localStorage.getItem('accessToken')).toBeNull();
      expect(localStorage.getItem('refreshToken')).toBeNull();
      expect(localStorage.getItem('user')).toBeNull();
    });
  });

  describe('redirectToLogin', () => {
    it('should redirect to Authinator login with current URL', () => {
      const hrefSetter = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost:3002/dashboard' },
        writable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => 'http://localhost:3002/dashboard',
      });

      redirectToLogin();
      expect(hrefSetter).toHaveBeenCalledWith(
        expect.stringContaining('/login?redirect=')
      );
    });
  });

  describe('redirectToServices', () => {
    it('should redirect to Authinator URL', () => {
      const hrefSetter = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => '',
      });

      redirectToServices();
      expect(hrefSetter).toHaveBeenCalled();
    });
  });

  describe('handleLogout', () => {
    it('should clear token and redirect to login', () => {
      localStorage.setItem('auth_token', 'tok');
      const hrefSetter = vi.fn();
      Object.defineProperty(window, 'location', {
        value: { href: '' },
        writable: true,
      });
      Object.defineProperty(window.location, 'href', {
        set: hrefSetter,
        get: () => '',
      });

      handleLogout();
      expect(localStorage.getItem('auth_token')).toBeNull();
      expect(hrefSetter).toHaveBeenCalled();
    });
  });
});
