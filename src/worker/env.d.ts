interface Env {
  CHALLENGES: KVNamespace;
  PHOTOS: R2Bucket;
  PHOTO_DERIVATIVES: R2Bucket;
  IMAGES: ImagesBinding;
  APP_BASE_URL: string;
  CDN_BASE_URL: string;
  IMAGE_TRANSFORM_PROVIDER: "cloudflare" | "none";
}
