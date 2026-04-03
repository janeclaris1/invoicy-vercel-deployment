/**
 * After a successful login, users always land on the workspace chooser
 * (POS vs Invoice Suite) unless they're completing checkout (handled in login.jsx).
 */
export function getPostLoginRedirectPath() {
    return "/choose-mode";
}
