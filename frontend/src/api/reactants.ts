import { apiClient } from "./client";
import type { UnifiedReactantDTO } from "../types/reactant";

export const reactantsApi = {
  getById: async (id: string): Promise<UnifiedReactantDTO> => {
    const res = await apiClient.get<UnifiedReactantDTO>(`/v2/reactants/${encodeURIComponent(id)}`);
    return res.data;
  },
  search: async (q: string, limit = 20) => {
    const res = await apiClient.get<any>(`/v2/reactants/search?q=${encodeURIComponent(q)}&limit=${limit}`);
    return res.data;
  },
  mix: async (reactants: string[]) => {
    const res = await apiClient.post<any>("/v2/reactants/mix", { reactants });
    return res.data;
  },
};
