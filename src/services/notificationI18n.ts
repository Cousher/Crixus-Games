import type { TFunction } from "i18next";

// Notifications are stored in the DB as plain English text by the backend
// (cronJobs, friendsRoutes, marketplaceRoutes). Matching the known templates
// here translates both new and already-stored notifications without a DB
// migration. Anything unrecognized is returned unchanged.

const MONEY = String.raw`(?:\$|K₽|KP)?\s*([\d.,]+)\s*(?:K₽|KP)?`;

type Rule = {
  re: RegExp;
  render: (t: TFunction, m: RegExpMatchArray) => string;
};

const titleRules: Rule[] = [
  { re: /^Award - (\d+) place$/i, render: (t, m) => t("notif.awardTitle", { place: m[1] }) },
  { re: /^Friend request accepted$/i, render: (t) => t("notif.friendAcceptedTitle") },
  { re: /^Friend request$/i, render: (t) => t("notif.friendRequestTitle") },
  { re: /^Item Sold$/i, render: (t) => t("notif.itemSoldTitle") },
];

const contentRules: Rule[] = [
  {
    re: new RegExp(`^You have been awarded ${MONEY} for being in the top 3 on the leaderboard!?$`, "i"),
    render: (t, m) => t("notif.awardContent", { amount: m[1] }),
  },
  {
    re: /^(.+) sent you a friend request$/i,
    render: (t, m) => t("notif.friendRequestContent", { user: m[1] }),
  },
  {
    re: /^(.+) accepted your friend request$/i,
    render: (t, m) => t("notif.friendAcceptedContent", { user: m[1] }),
  },
  {
    re: new RegExp(
      `^Your (.+?) has been sold for ${MONEY}(?: \\(you received ${MONEY} after the ([\\d.]+)% market fee\\))?\\.?$`,
      "i"
    ),
    render: (t, m) =>
      t("notif.itemSoldContent", { item: m[1], price: m[2] }) +
      (m[3] ? t("notif.itemSoldFee", { payout: m[3], fee: m[4] }) : ""),
  },
];

const apply = (rules: Rule[], text: string, t: TFunction): string => {
  const clean = (text || "").trim();
  for (const rule of rules) {
    const m = clean.match(rule.re);
    if (m) return rule.render(t, m);
  }
  return clean.replace(/K₽|KP/g, "$");
};

export const translateNotificationTitle = (text: string, t: TFunction) => apply(titleRules, text, t);
export const translateNotificationContent = (text: string, t: TFunction) => apply(contentRules, text, t);
