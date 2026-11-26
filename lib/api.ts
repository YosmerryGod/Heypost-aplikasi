const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://apihey.doodweb.tech";

export const apiConfig = {
  baseUrl: API_URL.replace(/\/$/, ""),
  trpcUrl: `${API_URL.replace(/\/$/, "")}/api/trpc`,
};

export function getApiUrl(path: string): string {
  return `${apiConfig.baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}