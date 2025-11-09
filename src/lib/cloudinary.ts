const DEFAULT_CLOUD_NAME = "dg2kyhuh0";
const DEFAULT_UPLOAD_PRESET = "collage_league";
const DEFAULT_FOLDER = "league-loom";

const getCloudinaryConfig = () => {
  const rawCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const rawUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  const rawFolder = import.meta.env.VITE_CLOUDINARY_UPLOAD_FOLDER;

  const cloudName = (rawCloudName ?? DEFAULT_CLOUD_NAME).trim();
  const trimmedPreset = rawUploadPreset?.trim();
  const uploadPreset = trimmedPreset && trimmedPreset.length > 0 ? trimmedPreset : DEFAULT_UPLOAD_PRESET;
  const folder = (rawFolder ?? DEFAULT_FOLDER).trim();

  if (!cloudName) {
    const message = "Missing Cloudinary cloud name. Define VITE_CLOUDINARY_CLOUD_NAME in your env and restart the dev server.";
    if (import.meta.env.DEV) {
      console.error(message, { rawCloudName });
    }
    throw new Error(message);
  }

  if (!trimmedPreset) {
    const message = `Missing Cloudinary upload preset. Falling back to default preset "${DEFAULT_UPLOAD_PRESET}". Define VITE_CLOUDINARY_UPLOAD_PRESET in your env and restart the dev server to override.`;
    if (import.meta.env.DEV) {
      console.warn(message, { rawUploadPreset, envKeys: Object.keys(import.meta.env) });
    }
  }

  return { cloudName, uploadPreset, folder } as const;
};

export const uploadImageToCloudinary = async (file: File): Promise<string> => {
  const { cloudName, uploadPreset, folder } = getCloudinaryConfig();

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", uploadPreset);
  formData.append("folder", folder);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Failed to upload image to Cloudinary");
  }

  if (typeof data.secure_url !== "string") {
    throw new Error("Cloudinary response did not include a secure_url");
  }

  return data.secure_url as string;
};
