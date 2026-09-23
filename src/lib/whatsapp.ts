import { getWhatsAppPhone } from "../modules/customers/domain/customer-phone.ts";

export type WhatsAppMessageData = {
  customerName: string;
  brand: string;
  model: string | null;
};

export function normalizeWhatsAppPhone(phone: string): string | null {
  const trimmed = phone.trim();
  const digits = trimmed.replace(/\D/g, "");

  const argentineMobile = getWhatsAppPhone(trimmed);

  if (argentineMobile) {
    return argentineMobile;
  }

  if (trimmed.startsWith("+54")) {
    return null;
  }

  if (trimmed.startsWith("+")) {
    return /^\d{8,15}$/.test(digits) ? digits : null;
  }

  if (trimmed.startsWith("00")) {
    const internationalDigits = digits.slice(2);
    return /^\d{8,15}$/.test(internationalDigits)
      ? internationalDigits
      : null;
  }

  return null;
}

export function buildQuoteWhatsAppMessage(
  data: WhatsAppMessageData,
): string {
  const machineName = [data.brand, data.model]
    .filter(Boolean)
    .join(" ");

  return `Hola, ${data.customerName}. Te escribimos de Máquinas Bagnus para avisarte que ya tenemos listo el presupuesto de reparación de tu máquina ${machineName}.\n\nQuedamos a la espera de tu confirmación para continuar con el trabajo.\n\nMuchas gracias.`;
}

export function buildFinishedRepairWhatsAppMessage(
  data: WhatsAppMessageData,
): string {
  const machineName = [data.brand, data.model]
    .filter(Boolean)
    .join(" ");

  return `Hola, ${data.customerName}. Te escribimos de Máquinas Bagnus para avisarte que la reparación de tu máquina ${machineName} ya está finalizada.\n\nTu máquina se encuentra lista para retirar en nuestro taller.\n\n¡Muchas gracias!`;
}

export function buildWhatsAppLink(
  phone: string,
  message: string,
): string | null {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (normalizedPhone === null) {
    return null;
  }

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}