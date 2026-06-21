import { renderHook } from "@testing-library/react";
import { useScrollRestoration } from "../useScrollRestoration";

describe("useScrollRestoration", () => {
  let scrollToMock: jest.Mock;

  beforeEach(() => {
    sessionStorage.clear();
    scrollToMock = jest.fn();
    jest.spyOn(window, "scrollTo").mockImplementation(scrollToMock);
  });

  afterEach(() => jest.restoreAllMocks());

  it("calls scrollTo with the saved position on mount", () => {
    sessionStorage.setItem("page-scroll", "500");
    renderHook(() => useScrollRestoration("page-scroll"));
    expect(scrollToMock).toHaveBeenCalledWith(0, 500);
  });

  it("clears the sessionStorage entry after restoring", () => {
    sessionStorage.setItem("page-scroll", "500");
    renderHook(() => useScrollRestoration("page-scroll"));
    expect(sessionStorage.getItem("page-scroll")).toBeNull();
  });

  it("does not call scrollTo when no position is saved", () => {
    renderHook(() => useScrollRestoration("page-scroll"));
    expect(scrollToMock).not.toHaveBeenCalled();
  });

  it("saves the current scroll position to sessionStorage on unmount", () => {
    Object.defineProperty(window, "scrollY", {
      value: 300,
      writable: true,
      configurable: true,
    });
    const { unmount } = renderHook(() => useScrollRestoration("page-scroll"));
    unmount();
    expect(sessionStorage.getItem("page-scroll")).toBe("300");
  });

  it("uses separate sessionStorage keys per hook instance", () => {
    sessionStorage.setItem("route-a", "100");
    sessionStorage.setItem("route-b", "200");
    renderHook(() => useScrollRestoration("route-a"));
    expect(scrollToMock).toHaveBeenCalledWith(0, 100);
    expect(scrollToMock).toHaveBeenCalledTimes(1);
  });
});
