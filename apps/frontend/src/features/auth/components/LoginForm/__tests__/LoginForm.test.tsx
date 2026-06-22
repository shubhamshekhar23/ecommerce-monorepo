import React from "react";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { renderWithProviders } from "@/__tests__/utils/renderWithProviders";
import { LoginForm } from "../LoginForm";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  usePathname: () => "/login",
  useSearchParams: () => new URLSearchParams(),
}));

const mockLogin = jest.fn();
let mockLoginState: { isPending: boolean; error: Error | null } = {
  isPending: false,
  error: null,
};

jest.mock("../../../hooks", () => ({
  useLogin: () => ({ mutate: mockLogin, ...mockLoginState }),
}));

describe("LoginForm", () => {
  beforeEach(() => {
    mockLogin.mockClear();
    mockLoginState = { isPending: false, error: null };
  });

  it("renders email and password fields with a submit button", () => {
    renderWithProviders(<LoginForm />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /sign in/i }),
    ).toBeInTheDocument();
  });

  it("shows validation error when submitted with invalid email", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    });
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it("calls login mutation with email and password on valid submit", async () => {
    const user = userEvent.setup();
    renderWithProviders(<LoginForm />);
    await user.type(
      screen.getByLabelText(/email address/i),
      "test@example.com",
    );
    await user.type(screen.getByLabelText(/password/i), "password123");
    await user.click(screen.getByRole("button", { name: /sign in/i }));
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        email: "test@example.com",
        password: "password123",
      });
    });
  });

  it("disables submit button while request is pending", () => {
    mockLoginState = { isPending: true, error: null };
    renderWithProviders(<LoginForm />);
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
  });

  it("shows server error when login mutation returns an error", () => {
    mockLoginState = {
      isPending: false,
      error: new Error("Invalid credentials"),
    };
    renderWithProviders(<LoginForm />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("shows session expired banner when sessionExpired prop is true", () => {
    renderWithProviders(<LoginForm sessionExpired />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(/session expired/i);
  });

  it("has no accessibility violations", async () => {
    const { container } = renderWithProviders(<LoginForm />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
