import { assertDocumentId } from "./firestore.mjs";

export const STORAGE_MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const STORAGE_IMAGE_CONTENT_TYPES = Object.freeze([
  "image/jpeg",
  "image/png",
  "image/webp"
]);

const extensionByContentType = Object.freeze({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
});

function assetFileName(assetId, contentType) {
  assertDocumentId(assetId, "assetId");
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/.test(assetId)) {
    throw new TypeError("assetId debe ser alfanumérico y puede incluir guion o guion bajo.");
  }
  const extension = extensionByContentType[contentType];
  if (!extension) throw new TypeError("Tipo de imagen no permitido.");
  return `${assetId}.${extension}`;
}

export function productImagePath(establishmentId, productId, assetId, contentType) {
  assertDocumentId(establishmentId, "establishmentId");
  assertDocumentId(productId, "productId");
  return `establishments/${establishmentId}/products/${productId}/${assetFileName(assetId, contentType)}`;
}

export function brandingImagePath(establishmentId, assetId, contentType) {
  assertDocumentId(establishmentId, "establishmentId");
  return `establishments/${establishmentId}/branding/${assetFileName(assetId, contentType)}`;
}

export function imageUploadMetadata(establishmentId, uploadedByUid, contentType, byteLength) {
  assertDocumentId(establishmentId, "establishmentId");
  assertDocumentId(uploadedByUid, "uploadedByUid");
  if (!STORAGE_IMAGE_CONTENT_TYPES.includes(contentType)) throw new TypeError("Tipo de imagen no permitido.");
  if (!Number.isInteger(byteLength) || byteLength < 1 || byteLength > STORAGE_MAX_IMAGE_BYTES) {
    throw new RangeError("La imagen debe tener entre 1 byte y 5 MiB.");
  }
  return Object.freeze({
    contentType,
    customMetadata: Object.freeze({ establishmentId, uploadedByUid })
  });
}
