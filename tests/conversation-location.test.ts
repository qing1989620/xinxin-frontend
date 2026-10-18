import { beforeEach, describe, expect, it, vi } from "vitest";

const preferences = vi.hoisted(() => new Map<string, string>());
vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => true },
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: vi.fn(async ({ key }) => ({ value: preferences.get(key) ?? null })),
    set: vi.fn(async ({ key, value }) => {
      preferences.set(key, value);
    }),
    remove: vi.fn(async ({ key }) => {
      preferences.delete(key);
    }),
  },
}));
beforeEach(() => {
  vi.resetModules();
  preferences.clear();
  const data = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
    removeItem: (key: string) => data.delete(key),
  });
});

describe("persistent Agent conversation", () => {
  it("survives a native process restart and isolates backend and owner", async () => {
    const first = await import("../src/conversationLocation");
    await first.configureConversationLocation("https://one.test/", "owner");
    first.rememberConversation("a".repeat(32));
    await first.configureConversationLocation("https://one.test", "owner");
    expect(first.rememberedConversation()).toBe("a".repeat(32));
    vi.resetModules();
    const restarted = await import("../src/conversationLocation");
    await restarted.configureConversationLocation("https://one.test", "owner");
    expect(restarted.rememberedConversation()).toBe("a".repeat(32));
    await restarted.configureConversationLocation("https://two.test", "owner");
    expect(restarted.rememberedConversation()).toBeNull();
    await restarted.configureConversationLocation(
      "https://one.test",
      "another-owner",
    );
    expect(restarted.rememberedConversation()).toBeNull();
    await restarted.configureConversationLocation("https://one.test", "owner");
    expect(restarted.rememberedConversation()).toBe("a".repeat(32));
  });
  it("clears explicit new/deleted selections without reviving them and rejects malformed ids", async () => {
    const location = await import("../src/conversationLocation");
    await location.configureConversationLocation("https://one.test", "owner");
    location.rememberConversation("b".repeat(32));
    location.forgetConversation("a".repeat(32));
    expect(location.rememberedConversation()).toBe("b".repeat(32));
    location.forgetConversation("b".repeat(32));
    location.rememberConversation("javascript:bad");
    await location.configureConversationLocation("https://one.test", "owner");
    expect(location.rememberedConversation()).toBeNull();
  });
});
