// [ADDED] Pisahkan identitas aplikasi development dan production berdasarkan profil EAS.
const base = require("./app.json");

module.exports = ({ config }) => {
  const variant = process.env.HEYPOST_VARIANT || "public";
  const isDevelopment = variant === "dev";
  const app = { ...base.expo, ...config };

  return {
    ...app,
    name: isDevelopment ? "HeyPost Dev" : "HeyPost",
    slug: "heypost-aplikasi",
    scheme: isDevelopment ? "heypost-dev" : "heypost",
    android: {
      ...app.android,
      package: isDevelopment ? "tech.doodweb.heypost.dev" : "tech.doodweb.heypost",
    },
    ios: {
      ...app.ios,
      bundleIdentifier: isDevelopment ? "tech.doodweb.heypost.dev" : "tech.doodweb.heypost",
    },
  };
};
