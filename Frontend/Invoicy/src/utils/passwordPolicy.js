/** Keep in sync with Backend/utils/passwordPolicy.js */
export const PASSWORD_MIN_LENGTH = 10;

const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

export function isPasswordStrongEnough(password) {
  if (typeof password !== "string") return false;
  if (password.length < PASSWORD_MIN_LENGTH) return false;
  return PASSWORD_STRENGTH_REGEX.test(password);
}
