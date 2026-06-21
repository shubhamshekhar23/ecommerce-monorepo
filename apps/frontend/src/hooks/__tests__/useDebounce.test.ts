import { renderHook, act } from "@testing-library/react";
import { useDebounce } from "../useDebounce";

describe("useDebounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("returns the initial value immediately without waiting", () => {
    const { result } = renderHook(() => useDebounce("hello", 300));
    expect(result.current).toBe("hello");
  });

  it("does not update value before the delay has elapsed", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } },
    );
    rerender({ value: "world" });
    act(() => jest.advanceTimersByTime(150));
    expect(result.current).toBe("hello");
  });

  it("updates value exactly when the delay elapses", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } },
    );
    rerender({ value: "world" });
    act(() => jest.advanceTimersByTime(300));
    expect(result.current).toBe("world");
  });

  it("resets the timer when value changes before the delay expires", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 300),
      { initialProps: { value: "hello" } },
    );
    rerender({ value: "interim" });
    act(() => jest.advanceTimersByTime(200));
    rerender({ value: "final" });
    // 200ms into 'final' delay — should not have fired yet
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe("hello");
    // Now the full 300ms for 'final' completes
    act(() => jest.advanceTimersByTime(100));
    expect(result.current).toBe("final");
  });

  it("works with non-string generics (number)", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 200),
      { initialProps: { value: 0 } },
    );
    rerender({ value: 42 });
    act(() => jest.advanceTimersByTime(200));
    expect(result.current).toBe(42);
  });
});
