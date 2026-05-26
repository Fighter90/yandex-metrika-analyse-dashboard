import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders } from '../test/utils';

vi.mock('../lib/api', () => ({
  api: {
    getSettings: vi.fn(),
    saveSettings: vi.fn(),
    sync: vi.fn(),
  },
}));
import { api } from '../lib/api';
import { SettingsView, Settings } from './settings';

const sampleSettings = {
  YANDEX_OAUTH_TOKEN: 'test****xx',
  YANDEX_CLIENT_ID: 'test-client-id',
  YANDEX_CLIENT_SECRET: 'test****xx',
  COUNTER_ID: '12345',
  GOAL_ID: '0',
  ANTHROPIC_API_KEY: 'sk-t****xx',
};

describe('SettingsView', () => {
  const baseProps = {
    status: 'success' as const,
    settings: sampleSettings,
    onSave: vi.fn(),
    onClear: vi.fn(),
    onRefresh: vi.fn(),
    onSaveError: undefined,
    onClearError: undefined,
    onRefreshError: undefined,
    isRefreshing: false,
    refreshResult: undefined,
  };

  it('renders loading state', () => {
    render(<SettingsView {...baseProps} status="pending" settings={undefined} />);
    expect(screen.getByText('Загрузка…')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(<SettingsView {...baseProps} status="error" settings={undefined} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('renders settings form on success', () => {
    render(<SettingsView {...baseProps} />);
    expect(screen.getByText('Настройки')).toBeInTheDocument();
    expect(screen.getByText('OAuth-токен Яндекс.Метрики')).toBeInTheDocument();
    expect(screen.getByText('Сохранить')).toBeInTheDocument();
    expect(screen.getByText('Очистить данные')).toBeInTheDocument();
  });

  it('renders the big refresh button', () => {
    render(<SettingsView {...baseProps} />);
    expect(screen.getByText(/Обновить данные из Метрики/)).toBeInTheDocument();
  });

  it('calls onRefresh when the refresh button is clicked', () => {
    const onRefresh = vi.fn();
    render(<SettingsView {...baseProps} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByText(/Обновить данные из Метрики/));
    expect(onRefresh).toHaveBeenCalled();
  });

  it('shows refresh result when provided', () => {
    render(<SettingsView {...baseProps} refreshResult={{ goals: 3, days: 14, channelRows: 50 }} />);
    expect(screen.getByText(/За 14 дн./)).toBeInTheDocument();
  });

  it('calls onSave with the form when the save button is clicked', () => {
    const onSave = vi.fn();
    render(<SettingsView {...baseProps} onSave={onSave} />);
    fireEvent.click(screen.getByText('Сохранить'));
    expect(onSave).toHaveBeenCalled();
  });

  it('calls onClear when the clear button is clicked', () => {
    const onClear = vi.fn();
    render(<SettingsView {...baseProps} onClear={onClear} />);
    fireEvent.click(screen.getByText('Очистить данные'));
    expect(onClear).toHaveBeenCalled();
  });

  it('syncs form when settings change', async () => {
    const { rerender } = render(<SettingsView {...baseProps} settings={undefined} />);
    // Initially empty form
    const counterInput = screen.getByPlaceholderText('12345678');
    // Empty string for number input shows as '' in DOM
    expect(counterInput).toHaveValue(null);
    // When settings arrive, form should update
    rerender(<SettingsView {...baseProps} settings={sampleSettings} />);
    await waitFor(() => {
      expect(counterInput).toHaveValue(12345);
    });
  });

  it('shows error messages for save/clear/refresh failures', () => {
    render(
      <SettingsView
        {...baseProps}
        onSaveError="Save failed"
        onClearError="Clear failed"
        onRefreshError="Refresh failed"
      />,
    );
    expect(screen.getByText('Save failed')).toBeInTheDocument();
    expect(screen.getByText('Clear failed')).toBeInTheDocument();
    expect(screen.getByText('Refresh failed')).toBeInTheDocument();
  });
});

describe('Settings (data wrapper)', () => {
  afterEach(() => vi.resetAllMocks());

  it('loads and renders settings form', async () => {
    vi.mocked(api.getSettings).mockResolvedValue({
      YANDEX_OAUTH_TOKEN: 'test****xx',
      YANDEX_CLIENT_ID: 'test-client-id',
      YANDEX_CLIENT_SECRET: 'test****xx',
      COUNTER_ID: 12345,
      GOAL_ID: 0,
      ANTHROPIC_API_KEY: 'sk-t****xx',
    });
    renderWithProviders(<Settings />);
    expect(await screen.findByText('Настройки')).toBeInTheDocument();
    // Verify data populated - number inputs compare as numbers
    expect(await screen.findByPlaceholderText('12345678')).toHaveValue(12345);
  });

  it('triggers sync on refresh', async () => {
    vi.mocked(api.getSettings).mockResolvedValue({
      YANDEX_OAUTH_TOKEN: '',
      YANDEX_CLIENT_ID: '',
      YANDEX_CLIENT_SECRET: '',
      COUNTER_ID: 0,
      GOAL_ID: 0,
      ANTHROPIC_API_KEY: '',
    });
    vi.mocked(api.sync).mockResolvedValue({
      goals: 3,
      days: 14,
      channelRows: 50,
      utmRows: 20,
      geoDeviceRows: 10,
      pageRows: 5,
      exitPageRows: 5,
    });
    renderWithProviders(<Settings />);
    // Wait for settings to load
    await screen.findByText('Настройки');
    // Click refresh
    fireEvent.click(screen.getByText(/Обновить данные из Метрики/));
    await waitFor(() => expect(api.sync).toHaveBeenCalled());
  });
});
