export function capitalizeNameInitials(value: string) {
  return value.replace(/(^|[\s'’\-])(\p{L})/gu, (_, separator: string, letter: string) => (
    `${separator}${letter.toUpperCase()}`
  ));
}
