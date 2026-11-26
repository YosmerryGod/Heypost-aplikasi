import * as SecureStore from "expo-secure-store";

const SESSION_KEY = "heypost.session-token";

// [ADDED] Backend accepts the same session token as an Authorization Bearer token.
export async function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

// [ADDED] Extract the HttpOnly session cookie returned by the existing backend login.
export async function persistSessionFromResponse(response: Response): Promise<void> {
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error("Server tidak mengirim sesi login. Periksa konfigurasi API.");
  }

  const match = setCookie.match(/(?:^|[,;\\s])heypost_session=([^;,\\s]+)/);
  if (!match?.[1]) {
    throw new Error("Token sesi tidak ditemukan pada respons server.");
  }

  await SecureStore.setItemAsync(SESSION_KEY, decodeURIComponent(match[1]), {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });
}

// [ADDED] Remove the locally persisted bearer token after server logout.
export async function clearSessionToken(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}
