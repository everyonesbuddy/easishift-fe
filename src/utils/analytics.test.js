import test from "node:test";
import assert from "node:assert/strict";
import {
  getAnalyticsPageContext,
  getAnalyticsUrl,
  initializeAnalytics,
  isAnalyticsHost,
  trackEvent,
  trackPageView,
} from "./analytics.js";

test("only business domains and their subdomains are recognized", () => {
  for (const hostname of [
    "wisershifts.com",
    "www.wisershifts.com",
    "clinic.wisershifts.com",
    "easishift.com",
  ]) {
    assert.equal(isAnalyticsHost(hostname), true);
  }
  for (const hostname of [
    "localhost",
    "127.0.0.1",
    "clinic.localhost",
    "easishift.netlify.app",
    "wisershifts.com.example.com",
  ]) {
    assert.equal(isAnalyticsHost(hostname), false);
  }
});

test("campaign attribution is retained without unrelated queries or fragments", () => {
  assert.equal(
    getAnalyticsUrl(
      "https://wisershifts.com/?utm_source=linkedin&utm_medium=social&email=private&_kx=private#private",
    ),
    "https://wisershifts.com/?utm_source=linkedin&utm_medium=social",
  );
  assert.equal(
    getAnalyticsUrl("https://wisershifts.com/features/scheduling"),
    "https://wisershifts.com/features/scheduling",
  );
});

test("private routes and reset tokens are replaced by a generic portal path", () => {
  for (const path of [
    "/reset-password?token=secret",
    "/messages?staff=secret",
    "/staffs/secret",
    "/billing/success?session_id=secret",
  ]) {
    assert.equal(
      getAnalyticsUrl(`https://clinic.wisershifts.com${path}`),
      "https://clinic.wisershifts.com/portal",
    );
  }
});

test("page context distinguishes workspace areas without exposing private URLs", () => {
  const context = getAnalyticsPageContext(
    "https://clinic.wisershifts.com/schedule?staff=secret",
  );
  assert.equal(context.site_area, "workspace");
  assert.equal(context.page_area, "schedule");
  assert.equal(context.page_location, "https://clinic.wisershifts.com/portal");
  assert.equal(
    getAnalyticsPageContext("https://www.wisershifts.com/pricing").site_area,
    "main_site",
  );
  assert.equal(
    getAnalyticsPageContext("https://clinic.easishift.com/messages").page_area,
    "messages",
  );
  assert.equal(
    getAnalyticsPageContext("https://clinic.wisershifts.com/staffs/secret")
      .page_area,
    "portal",
  );
});

test("initialization, navigation and CTA events are queued once and tolerate tracking failures", () => {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const listeners = {};
  const scripts = [];
  globalThis.window = {
    location: new URL("https://wisershifts.com/?utm_source=linkedin"),
  };
  globalThis.document = {
    referrer: "https://linkedin.com/feed?email=private",
    createElement: () => ({}),
    head: { appendChild: (script) => scripts.push(script) },
    addEventListener: (name, handler) => {
      listeners[name] = handler;
    },
  };
  try {
    initializeAnalytics({ enabled: false, id: "G-20LSFMFPL1" });
    trackEvent("sign_up");
    assert.equal(window.gtag, undefined);
    initializeAnalytics({ enabled: true, id: "invalid" });
    assert.equal(window.gtag, undefined);
    initializeAnalytics({ enabled: true, id: "G-20LSFMFPL1", debug: true });
    initializeAnalytics({ enabled: true, id: "G-20LSFMFPL1" });
    assert.equal(scripts.length, 1);
    const events = (name) =>
      window.dataLayer.filter(
        (args) => args[0] === "event" && args[1] === name,
      );
    const config = window.dataLayer.find((args) => args[0] === "config")[2];
    assert.equal(config.send_page_view, false);
    assert.equal(config.debug_mode, true);
    trackPageView();
    trackPageView();
    assert.equal(events("page_view").length, 1);
    window.location = new URL(
      "https://wisershifts.com/signup-tenant?email=private",
    );
    trackPageView();
    assert.equal(events("page_view").length, 2);
    assert.equal(
      events("page_view")[1][2].page_referrer,
      "https://wisershifts.com/?utm_source=linkedin",
    );
    const click = (href, button = 0) => ({
      button,
      target: { closest: () => ({ href }) },
    });
    listeners.click(click("https://calendly.com/wisershifts-info/30min"));
    assert.equal(events("book_demo_click").length, 1);
    assert.equal(events("generate_lead").length, 0);
    listeners.click(click("https://calendly.com.example.com/30min"));
    assert.equal(events("book_demo_click").length, 1);
    listeners.auxclick(click("https://calendly.com/wisershifts-info/30min", 1));
    assert.equal(events("book_demo_click").length, 2);
    listeners.click(click("https://wisershifts.com/signup-tenant"));
    listeners.click(click("https://wisershifts.com/login"));
    assert.equal(events("signup_click").length, 1);
    assert.equal(events("login_click").length, 1);
    trackEvent("sign_up", { method: "password", account_type: "organization" });
    trackEvent("login", { method: "password" });
    assert.equal(events("sign_up")[0][2].send_to, "G-20LSFMFPL1");
    assert.equal(events("login").length, 1);
    window.location = new URL(
      "https://clinic.wisershifts.com/schedule?staff=private",
    );
    trackPageView();
    window.location = new URL(
      "https://clinic.wisershifts.com/messages?staff=private",
    );
    trackPageView();
    trackPageView();
    assert.equal(events("page_view").length, 4);
    assert.equal(events("page_view")[2][2].page_area, "schedule");
    assert.equal(events("page_view")[3][2].page_area, "messages");
    assert.equal(JSON.stringify(window.dataLayer).includes("private"), false);
    window.gtag = () => {
      throw new Error("Tracking unavailable");
    };
    assert.doesNotThrow(() => trackEvent("sign_up"));
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDocument;
  }
});
