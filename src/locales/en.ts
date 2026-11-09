import about from "./en/about";
import achievements from "./en/achievements";
import admin from "./en/admin";
import catchDict from "./en/catch";
import errors from "./en/errors";
import forecast from "./en/forecast";
import friends from "./en/friends";
import home from "./en/home";
import map from "./en/map";
import legal from "./en/legal";
import login from "./en/login";
import nav from "./en/nav";
import profile from "./en/profile";
import register from "./en/register";
import users from "./en/users";

const en = {
  ...nav,
  ...catchDict,
  ...login,
  ...register,
  ...about,
  ...legal,
  ...friends,
  ...profile,
  ...home,
  ...map,
  ...users,
  ...admin,
  ...achievements,
  ...errors,
  ...forecast,
} as const;

export default en;
