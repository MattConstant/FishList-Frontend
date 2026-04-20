import about from "./fr/about";
import admin from "./fr/admin";
import catchDict from "./fr/catch";
import errors from "./fr/errors";
import forecast from "./fr/forecast";
import friends from "./fr/friends";
import home from "./fr/home";
import legal from "./fr/legal";
import login from "./fr/login";
import nav from "./fr/nav";
import profile from "./fr/profile";
import users from "./fr/users";

const fr = {
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
  ...forecast,
} as const;

export default fr;
