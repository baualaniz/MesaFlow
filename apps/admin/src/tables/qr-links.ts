import QRCode from "qrcode";

import { adminEnvironment } from "../config/environment";
import { buildCustomerQrUrl, customerBaseUrlFor } from "./qr-url";

export interface PrintableQr {
  readonly tableId: string;
  readonly tableName: string;
  readonly tableNumber: number;
  readonly url: string;
  readonly dataUrl: string;
}

export async function printableQr(
  tableId: string,
  tableName: string,
  tableNumber: number,
  establishmentSlug: string,
  token: string
): Promise<PrintableQr> {
  const url = buildCustomerQrUrl(
    establishmentSlug,
    tableId,
    token,
    customerBaseUrlFor(adminEnvironment)
  );
  const dataUrl = await QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: { dark: "#17231b", light: "#ffffff" }
  });
  return Object.freeze({ tableId, tableName, tableNumber, url, dataUrl });
}
