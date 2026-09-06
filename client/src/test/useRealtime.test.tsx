import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useRealtime } from '../hooks/useRealtime';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: string }) => void) | null = null;
  onclose: ((event: { code: number }) => void) | null = null;
  closed = false;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  close() {
    this.closed = true;
  }
}

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient();
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useRealtime', () => {
  beforeEach(() => {
    FakeWebSocket.instances = [];
    vi.stubGlobal('WebSocket', FakeWebSocket);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('reconnects with backoff after an unexpected disconnect', () => {
    const { unmount } = renderHook(() => useRealtime('trip-1'), { wrapper });
    expect(FakeWebSocket.instances).toHaveLength(1);

    FakeWebSocket.instances[0]?.onclose?.({ code: 1006 });
    expect(FakeWebSocket.instances).toHaveLength(1); // not yet -- waiting on the backoff timer

    vi.advanceTimersByTime(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);

    unmount();
  });

  it('does not reconnect after a non-retryable close code (e.g. not a trip member)', () => {
    const { unmount } = renderHook(() => useRealtime('trip-1'), { wrapper });
    FakeWebSocket.instances[0]?.onclose?.({ code: 4003 });

    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);

    unmount();
  });

  it('stops reconnecting once unmounted', () => {
    const { unmount } = renderHook(() => useRealtime('trip-1'), { wrapper });
    const socket = FakeWebSocket.instances[0]!;
    unmount();

    socket.onclose?.({ code: 1006 });
    vi.advanceTimersByTime(60_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(socket.closed).toBe(true);
  });
});
