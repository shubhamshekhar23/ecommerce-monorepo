import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "../useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => localStorage.clear());

  it("returns the initialValue when no key exists in storage", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("reads an existing localStorage value on mount", () => {
    localStorage.setItem("key", JSON.stringify("stored"));
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("stored");
  });

  it("updates state and writes to localStorage when setter is called", () => {
    const { result } = renderHook(() => useLocalStorage("key", "init"));
    act(() => result.current[1]("updated"));
    expect(result.current[0]).toBe("updated");
    expect(JSON.parse(localStorage.getItem("key")!)).toBe("updated");
  });

  it("supports functional update form", () => {
    const { result } = renderHook(() => useLocalStorage("count", 0));
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(1);
    act(() => result.current[1]((n) => n + 1));
    expect(result.current[0]).toBe(2);
  });

  it("persists objects as JSON", () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ x: number }>("obj", { x: 0 }),
    );
    act(() => result.current[1]({ x: 42 }));
    expect(result.current[0]).toEqual({ x: 42 });
    expect(JSON.parse(localStorage.getItem("obj")!)).toEqual({ x: 42 });
  });

  it("persists arrays", () => {
    const { result } = renderHook(() => useLocalStorage<string[]>("arr", []));
    act(() => result.current[1](["a", "b"]));
    expect(result.current[0]).toEqual(["a", "b"]);
  });

  it("uses separate state for different keys", () => {
    const { result: r1 } = renderHook(() => useLocalStorage("k1", "one"));
    const { result: r2 } = renderHook(() => useLocalStorage("k2", "two"));
    act(() => r1.current[1]("ONE"));
    expect(r1.current[0]).toBe("ONE");
    expect(r2.current[0]).toBe("two");
  });

  it("falls back to initialValue when stored JSON is corrupt", () => {
    localStorage.setItem("bad", "not-valid-json{{{");
    const { result } = renderHook(() => useLocalStorage("bad", "fallback"));
    expect(result.current[0]).toBe("fallback");
  });
});
