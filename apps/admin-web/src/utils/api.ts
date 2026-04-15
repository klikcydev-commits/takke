import axios, { type AxiosInstance } from "axios";
import { createClient } from "@/lib/supabase/client";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL && process.env.NEXT_PUBLIC_API_URL.length > 0
    ? process.env.NEXT_PUBLIC_API_URL
    : typeof window !== "undefined"
      ? "/api"
      : process.env.API_INTERNAL_URL ?? "http://127.0.0.1:3002";

async function getClient(): Promise<AxiosInstance> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token ?? null;

  return axios.create({
    baseURL: API_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
      "Content-Type": "application/json",
    },
  });
}

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
