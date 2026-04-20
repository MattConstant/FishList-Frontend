import about from "./en/about";
import admin from "./en/admin";
import catchDict from "./en/catch";
import errors from "./en/errors";
import friends from "./en/friends";
import home from "./en/home";
import legal from "./en/legal";
import login from "./en/login";
import nav from "./en/nav";
import profile from "./en/profile";
import users from "./en/users";

const en = {
  ...nav,
  ...catchDict,
  ...login,
  ...about,
  ...legal,
  ...friends,
  ...profile,
  ...home,
  ...users,
  ...admin,
  ...errors,
} as const;

export default en;
