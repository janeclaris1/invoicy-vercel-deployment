/** Minimum length for new passwords (register, reset, change, pending signup). */
const PASSWORD_MIN_LENGTH = 10;

/** Same complexity as registration: upper, lower, digit. */
const PASSWORD_STRENGTH_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

function isStrongEnough(password) {
    if (typeof password !== "string") return false;
    if (password.length < PASSWORD_MIN_LENGTH) return false;
    return PASSWORD_STRENGTH_REGEX.test(password);
}

module.exports = {
    PASSWORD_MIN_LENGTH,
    PASSWORD_STRENGTH_REGEX,
    isStrongEnough,
};
