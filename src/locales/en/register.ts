export default {
  "register.title": "Create account",
  "register.desc": "Choose a username, email, and password (at least 8 characters).",
  "register.email": "Email",
  "register.confirmPassword": "Confirm password",
  "register.submit": "Register",
  "register.mismatch": "Passwords do not match.",
  "register.passwordTooShort": "Password must be at least 8 characters.",
  "register.invalidEmail": "Enter a valid email address.",
  "register.linkLogin": "Already have an account? Log in",
  "register.checkEmailTitle": "Confirm your email",
  "register.checkEmailBody":
    "We sent a confirmation link to {{email}}. Open it to finish creating your account, then sign in.",
  "register.checkEmailHint":
    "In local development, the link is printed in the backend logs when outbound mail is disabled.",
  "register.resend": "Resend confirmation email",
  "register.resending": "Sending…",
  "register.resendFailed": "Could not resend the confirmation email.",
  "verifyEmail.title": "Email confirmation",
  "verifyEmail.working": "Confirming your email…",
  "verifyEmail.missingToken": "This confirmation link is missing or invalid.",
  "verifyEmail.failed": "This confirmation link is invalid or has expired.",
  "verifyEmail.goLogin": "Go to log in",
} as const;
