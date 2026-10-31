const OLD = /^[A-Z]{3}[0-9]{4}$/;
const MERCOSUL = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;
const LETTERS = 'ABCDEFGHIJ';

export function normalizePlate(input) {
  return String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function plateFormat(plate) {
  if (OLD.test(plate)) return 'antiga';
  if (MERCOSUL.test(plate)) return 'mercosul';
  return null;
}

export function isValidPlate(plate) {
  return plateFormat(plate) !== null;
}

// No padrão Mercosul o 2º número da placa antiga vira letra: 0→A, 1→B, ..., 9→J.
export function toMercosul(plate) {
  if (!OLD.test(plate)) return plate;
  return plate.slice(0, 4) + LETTERS[Number(plate[4])] + plate.slice(5);
}

export function toOld(plate) {
  if (!MERCOSUL.test(plate)) return plate;
  const i = LETTERS.indexOf(plate[4]);
  return i === -1 ? null : plate.slice(0, 4) + i + plate.slice(5);
}

export function formatPlate(plate) {
  return OLD.test(plate) ? `${plate.slice(0, 3)}-${plate.slice(3)}` : plate;
}

export function maskChassi(chassi) {
  const c = String(chassi ?? '').trim();
  if (!c) return null;
  return c.length <= 6 ? c : '*'.repeat(c.length - 6) + c.slice(-6);
}
