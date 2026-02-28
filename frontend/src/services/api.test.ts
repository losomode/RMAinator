import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockInstance = {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockInstance),
      get: vi.fn(),
    },
  };
});

vi.mock('../utils/auth', () => ({
  getToken: vi.fn(() => 'test-token'),
  redirectToLogin: vi.fn(),
}));

describe('api module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should create axios instance with correct baseURL', async () => {
    await import('./api');
    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: expect.stringContaining('/api'),
      })
    );
  });

  it('should register request and response interceptors', async () => {
    await import('./api');
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(instance.interceptors.request.use).toHaveBeenCalled();
    expect(instance.interceptors.response.use).toHaveBeenCalled();
  });

  it('rmaAPI.list should call api.get with params', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    await mod.rmaAPI.list({ archived: false });
    expect(instance.get).toHaveBeenCalledWith('/rma/', { params: { archived: false } });
  });

  it('rmaAPI.create should post RMA data', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 1 } });

    await mod.rmaAPI.create({ serial_number: 'SN-1' });
    expect(instance.post).toHaveBeenCalledWith('/rma/', { serial_number: 'SN-1' });
  });

  it('rmaAPI.get should fetch single RMA', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 1 } });

    await mod.rmaAPI.get(1);
    expect(instance.get).toHaveBeenCalledWith('/rma/1/');
  });

  it('rmaAPI.update should patch RMA', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.patch as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    await mod.rmaAPI.update(1, { state: 'APPROVED' });
    expect(instance.patch).toHaveBeenCalledWith('/rma/1/', { state: 'APPROVED' });
  });

  it('rmaAPI.delete should delete RMA', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await mod.rmaAPI.delete(1);
    expect(instance.delete).toHaveBeenCalledWith('/rma/1/');
  });

  it('rmaAPI.updateState should post state change', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await mod.rmaAPI.updateState(1, { state: 'APPROVED' });
    expect(instance.post).toHaveBeenCalledWith('/rma/1/state/', { state: 'APPROVED' });
  });

  it('rmaAPI.search should call search endpoint', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    await mod.rmaAPI.search({ q: 'test' });
    expect(instance.get).toHaveBeenCalledWith('/rma/search/', { params: { q: 'test' } });
  });

  it('rmaAPI.getAdminDashboard should call admin endpoint', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    await mod.rmaAPI.getAdminDashboard();
    expect(instance.get).toHaveBeenCalledWith('/rma/admin/dashboard/');
  });

  it('authAPI.getCurrentUser should call Authinator', async () => {
    const mod = await import('./api');
    (axios.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: { id: 1 } });

    await mod.authAPI.getCurrentUser();
    expect(axios.get).toHaveBeenCalledWith(
      expect.stringContaining('/api/auth/me/'),
      expect.objectContaining({ headers: expect.any(Object) })
    );
  });

  it('rmaAPI.uploadAttachment should post FormData', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const file = new File(['content'], 'test.pdf', { type: 'application/pdf' });
    await mod.rmaAPI.uploadAttachment(1, file);
    expect(instance.post).toHaveBeenCalledWith(
      '/rma/1/attachments/',
      expect.any(FormData),
      expect.objectContaining({ headers: { 'Content-Type': 'multipart/form-data' } })
    );
  });

  it('rmaAPI.deleteAttachment should delete attachment', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.delete as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await mod.rmaAPI.deleteAttachment(5);
    expect(instance.delete).toHaveBeenCalledWith('/rma/attachments/5/');
  });

  it('rmaAPI.createGroup should post group data', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const data = { rmas: [{ serial_number: 'SN-1', first_ship_date: null, fault_notes: 'broken', priority: 'NORMAL' }] };
    await mod.rmaAPI.createGroup(data);
    expect(instance.post).toHaveBeenCalledWith('/rma/group/', data);
  });

  it('authAPI.register should post registration data', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await mod.authAPI.register({ username: 'user' });
    expect(instance.post).toHaveBeenCalledWith('/auth/register/', { username: 'user' });
  });

  it('authAPI.getPendingUsers should call pending endpoint', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.get as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });

    await mod.authAPI.getPendingUsers();
    expect(instance.get).toHaveBeenCalledWith('/auth/pending/');
  });

  it('authAPI.approveUser should post approval', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.post as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await mod.authAPI.approveUser(1, true);
    expect(instance.post).toHaveBeenCalledWith('/auth/1/approve/', { approve: true });
  });

  it('authAPI.login should post login data', async () => {
    const mod = await import('./api');
    const instance = mod.default;
    (instance.post as ReturnType<typeof vi.fn>).mockResolvedValue({ data: {} });

    await mod.authAPI.login({ username: 'u', password: 'p' });
    expect(instance.post).toHaveBeenCalledWith('/auth/login/', { username: 'u', password: 'p' });
  });

  it('request interceptor should add auth token', async () => {
    await import('./api');
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0];

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor(config);
    expect(result.headers.Authorization).toBe('Bearer test-token');
  });

  it('request interceptor should skip if no token', async () => {
    const authUtils = await import('../utils/auth');
    vi.mocked(authUtils.getToken).mockReturnValue(null);

    await import('./api');
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const requestInterceptor = instance.interceptors.request.use.mock.calls[0][0];

    const config = { headers: {} as Record<string, string> };
    const result = requestInterceptor(config);
    expect(result.headers.Authorization).toBeUndefined();
  });

  it('request interceptor error handler should reject', async () => {
    await import('./api');
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const errorHandler = instance.interceptors.request.use.mock.calls[0][1];

    await expect(errorHandler(new Error('fail'))).rejects.toThrow('fail');
  });

  it('response interceptor should pass through successful responses', async () => {
    await import('./api');
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const successHandler = instance.interceptors.response.use.mock.calls[0][0];

    const response = { data: 'ok', status: 200 };
    expect(successHandler(response)).toBe(response);
  });

  it('response interceptor should redirect on 401', async () => {
    const authUtils = await import('../utils/auth');
    await import('./api');
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const errorHandler = instance.interceptors.response.use.mock.calls[0][1];

    const error = { response: { status: 401 } };
    await expect(errorHandler(error)).rejects.toBe(error);
    expect(authUtils.redirectToLogin).toHaveBeenCalled();
  });

  it('response interceptor should reject non-401 errors', async () => {
    await import('./api');
    const instance = (axios.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const errorHandler = instance.interceptors.response.use.mock.calls[0][1];

    const error = { response: { status: 500 } };
    await expect(errorHandler(error)).rejects.toBe(error);
  });
});
