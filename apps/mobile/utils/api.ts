import axios from "axios";
import { supabase } from "./supabase";
import { getMarketplaceApiBase } from "./marketplaceAuth";

/**
 * Axios client for vendor-web `/api/*` (Prisma + Supabase JWT).
 * Uses the Supabase session access token from secure storage.
 */
const getClient = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  const baseURL = getMarketplaceApiBase();

  return axios.create({
    baseURL,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
};

export const api = {
  get: async <T>(url: string) => {
    const client = await getClient();
    const response = await client.get<T>(url);
    return response.data;
  },
  post: async <T>(url: string, data?: unknown) => {
    const client = await getClient();
    const response = await client.post<T>(url, data);
    return response.data;
  },
  patch: async <T>(url: string, data?: unknown) => {
    const client = await getClient();
    const response = await client.patch<T>(url, data);
    return response.data;
  },
  delete: async <T>(url: string) => {
    const client = await getClient();
    const response = await client.delete<T>(url);
    return response.data;
  },
};

export default api;
