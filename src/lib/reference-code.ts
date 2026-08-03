import { customAlphabet } from "nanoid";

const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
const generate = customAlphabet(ALPHABET, 8);

export function generateBookingReference(): string {
  return `DA-${generate()}`;
}
