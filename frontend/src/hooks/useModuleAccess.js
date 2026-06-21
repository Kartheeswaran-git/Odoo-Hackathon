import { useMemo } from 'react';
import { useAuth } from './useAuth';

const ROLE_MODULES = {
  Admin: ['*'],
  Sales: ['dashboard', 'parties', 'items', 'sales'],
  Purchase: ['dashboard', 'parties', 'items', 'purchases'],
  Manufacturing: ['dashboard', 'items', 'manufacturing'],
};

export function useModuleAccess() {
  const { profile, loading, permissions } = useAuth();

  return useMemo(() => ({
    role: profile?.role ?? null,
    loading,
    can: (module, action = 'view') => {
      if (!profile?.active) return false;
      if (profile.role === 'Admin') return true;
      const field = `can_${action}`;
      const permission = permissions?.find((item) => item.module_name === module);
      return permission ? Boolean(permission[field]) : Boolean(ROLE_MODULES[profile.role]?.includes(module));
    },
    canAccess: (module) => {
      if (!profile?.active) return false;
      if (profile.role === 'Admin') return true;
      const permission = permissions?.find((item) => item.module_name === module);
      return permission ? Boolean(permission.can_view) : Boolean(ROLE_MODULES[profile.role]?.includes(module));
    },
  }), [loading, permissions, profile]);
}
