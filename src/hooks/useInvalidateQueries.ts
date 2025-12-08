import { useQueryClient } from '@tanstack/react-query';

/**
 * Hook pour invalider les caches de requêtes après des modifications
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  const invalidateSales = () => {
    queryClient.invalidateQueries({ queryKey: ['sales'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['sales-by-period'] });
    queryClient.invalidateQueries({ queryKey: ['sales-by-payment'] });
    queryClient.invalidateQueries({ queryKey: ['top-products'] });
    queryClient.invalidateQueries({ queryKey: ['top-customers'] });
  };

  const invalidateProducts = () => {
    queryClient.invalidateQueries({ queryKey: ['products'] });
    queryClient.invalidateQueries({ queryKey: ['products-search'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['low-stock'] });
    queryClient.invalidateQueries({ queryKey: ['expiring-products'] });
  };

  const invalidateCustomers = () => {
    queryClient.invalidateQueries({ queryKey: ['customers'] });
    queryClient.invalidateQueries({ queryKey: ['top-customers'] });
  };

  const invalidateSuppliers = () => {
    queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['orders'] });
  };

  const invalidateAll = () => {
    invalidateSales();
    invalidateProducts();
    invalidateCustomers();
    invalidateSuppliers();
  };

  return {
    invalidateSales,
    invalidateProducts,
    invalidateCustomers,
    invalidateSuppliers,
    invalidateAll,
  };
}

