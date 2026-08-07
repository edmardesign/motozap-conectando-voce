import { onlyDigits } from "./phone";

export function empresaPhoneToEmail(phone: string): string {
  return `${onlyDigits(phone)}@motezap-empresa.app`;
}
