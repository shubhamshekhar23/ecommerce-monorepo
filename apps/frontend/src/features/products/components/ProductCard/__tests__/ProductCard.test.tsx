import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { renderWithProviders } from '@/__tests__/utils/renderWithProviders';
import { ProductCard } from '../ProductCard';
import { useAuthStore } from '@/store/auth.store';
import type { Product } from '../../../interfaces';

const mockPush = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: jest.fn(), prefetch: jest.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

// Isolate from the cart mutation — component tests shouldn't hit the network.
const mockAddToCart = jest.fn();
jest.mock('@/features/cart/hooks', () => ({
  useAddToCart: () => ({ mutate: mockAddToCart, isPending: false }),
}));

const mockProduct: Product = {
  id: 'prod-1',
  name: 'Blue Ceramic Mug',
  slug: 'blue-ceramic-mug',
  description: 'A nice mug',
  price: 24.99,
  cost: 12,
  stock: 5,
  categoryId: 'cat-1',
  images: [{ id: 'img-1', url: '/mug.jpg', altText: 'Blue mug', isMain: true, order: 0 }],
  variants: [],
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('ProductCard', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockAddToCart.mockClear();
    useAuthStore.setState({ status: 'unauthenticated', user: null, accessToken: null });
  });

  it('renders product name, price, and in-stock status', () => {
    renderWithProviders(<ProductCard product={mockProduct} />);
    expect(screen.getByText('Blue Ceramic Mug')).toBeInTheDocument();
    expect(screen.getByText('$24.99')).toBeInTheDocument();
    expect(screen.getByText('In Stock (5)')).toBeInTheDocument();
  });

  it('disables Add to Cart button when stock is 0', () => {
    renderWithProviders(<ProductCard product={{ ...mockProduct, stock: 0 }} />);
    expect(screen.getByRole('button', { name: /add to cart/i })).toBeDisabled();
    expect(screen.getByText('Out of Stock')).toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login on cart click', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ProductCard product={mockProduct} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(mockPush).toHaveBeenCalledWith('/login');
    expect(mockAddToCart).not.toHaveBeenCalled();
  });

  it('calls addToCart mutation for authenticated user', async () => {
    useAuthStore.setState({
      status: 'authenticated',
      user: {
        id: 'u1',
        email: 'a@b.com',
        firstName: 'A',
        lastName: 'B',
        role: 'USER',
        isActive: true,
        emailVerified: true,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
      },
      accessToken: 'token',
    });
    const user = userEvent.setup();
    renderWithProviders(<ProductCard product={mockProduct} />);
    await user.click(screen.getByRole('button', { name: /add to cart/i }));
    expect(mockAddToCart).toHaveBeenCalledWith(
      { productId: 'prod-1', quantity: 1 },
      expect.any(Object),
    );
  });

  it('renders within 50ms performance budget', () => {
    const start = performance.now();
    renderWithProviders(<ProductCard product={mockProduct} />);
    expect(performance.now() - start).toBeLessThan(50);
  });

  it('has no accessibility violations', async () => {
    const { container } = renderWithProviders(<ProductCard product={mockProduct} />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
