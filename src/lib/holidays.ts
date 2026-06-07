export const KERALA_HOLIDAYS_2026 = new Set([
  "01-02", // Mannam Jayanthi
  "01-26", // Republic Day
  "03-20", // Id-ul-Fitr (Ramzan)
  "04-01", // Annual closing of banks
  "04-02", // Maundy Thursday
  "04-03", // Good Friday
  "04-14", // Dr. B. R. Ambedkar Jayanthi
  "04-15", // Vishu
  "05-01", // May Day
  "05-27", // Id-ul-Ad'ha (Bakrid)
  "08-15", // Independence Day
  "08-25", // First Onam / Milad-i-Sherif
  "08-26", // Thiruvonam
  "08-28", // Sree Narayana Guru Jayanthi / Ayyankali Jayanthi
  "09-04", // Sreekrishna Jayanthi
  "09-21", // Sree Narayana Guru Samadhi
  "10-02", // Gandhi Jayanthi
  "10-20", // Mahanavami
  "10-21", // Vijayadasami
  "12-25", // Christmas
]);

export function isKeralaHoliday(date: Date): boolean {
  if (date.getDay() === 0) return true; // Sunday
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const key = `${mm}-${dd}`;
  return KERALA_HOLIDAYS_2026.has(key);
}

export function getNextWorkingDay(date: Date): Date {
  let current = new Date(date.getTime());
  while (isKeralaHoliday(current)) {
    current = new Date(current.getTime() + 24 * 60 * 60 * 1000);
  }
  return current;
}
