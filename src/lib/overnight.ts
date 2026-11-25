export const OVERNIGHT_CHECKOUT_TIME = "20:00";
export const OVERNIGHT_MAX_NIGHTS = 5;

const overnightPrices = [1500, 1200, 3900, 5100, 6300] as const;

export function getOvernightPrice(nights: number) {
  if (!Number.isInteger(nights) || nights < 1 || nights > OVERNIGHT_MAX_NIGHTS) {
    throw new RangeError(`A quantidade de noites deve estar entre 1 e ${OVERNIGHT_MAX_NIGHTS}.`);
  }
  return overnightPrices[nights - 1];
}

export function getOvernightDurationMinutes(nights: number, startTime = "08:00") {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [checkoutHour, checkoutMinute] = OVERNIGHT_CHECKOUT_TIME.split(":").map(Number);
  const minutesUntilCheckout = checkoutHour * 60 + checkoutMinute - (startHour * 60 + startMinute);
  return nights * 1440 + minutesUntilCheckout;
}
