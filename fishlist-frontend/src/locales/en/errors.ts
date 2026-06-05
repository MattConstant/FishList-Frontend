export default {
  "errors.uploadLimitReached": "Upload limit reached. Please try again tomorrow.",
  "errors.aiIdentifyInconclusive": "Could not confidently identify the fish.",
  "errors.aiIdentifyFailed": "Failed to identify fish from image.",
  "errors.saveCatchFailed": "Failed to save catch.",
  "errors.backendUnreachable":
    "We couldn't reach FishList. Check your internet connection, or try again in a few minutes.",
  "errors.backendUnavailable":
    "FishList is temporarily unavailable (gateway error). Please try again shortly.",
  "errors.backendServerError": "Something went wrong on the server. Please try again later.",
  "errors.accountLoadFailed":
    "You're still signed in, but we couldn't load your account. Check your connection or try again.",
  "errors.retry": "Retry",
  "errors.retrying": "Retrying…",
  "errors.signOutInstead": "Sign out",
  "errors.offlineHomeHint": "Use the yellow bar at the top to retry or sign out.",
} as const;
