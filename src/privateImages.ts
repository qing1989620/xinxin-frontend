import { ApiError, getBlob } from "./api";

export async function loadPrivateImage(path: string, signal: AbortSignal) {
  const preview = path.replace(
    /^(\/files\/[a-f\d]{32})\/download\?inline=true$/i,
    "$1/preview",
  );
  try {
    return await getBlob(preview, signal);
  } catch (error) {
    // Keep images usable when the frontend reaches an older backend.
    if (preview !== path && error instanceof ApiError && error.status === 404)
      return getBlob(path, signal);
    throw error;
  }
}
