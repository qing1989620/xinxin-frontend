import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "com.xinxin.personal",
  appName: "Xinxin",
  webDir: "dist",
  server: { androidScheme: "https" },
  android: { backgroundColor: "#f7f5ef" },
};
export default config;
