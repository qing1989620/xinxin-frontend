import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.xinxin.personal",
  appName: "Xinxin",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: {
    backgroundColor: "#f7f5ef",
    allowMixedContent: process.env.VITE_LOCAL_PHONE_TEST === "1",
  },
};
export default config;
