import type { BrandLibrary } from "./types";

/**
 * Demo brand: "Verda Skin", a fictional Indian D2C skincare brand.
 * Everything here is invented for the demo.
 */
export const seedLibrary: BrandLibrary = {
  brandName: "Verda Skin",
  voice:
    "Calm, honest and science-backed. We celebrate real skin, never shame it, and we only claim what we can prove.",
  terms: [
    {
      id: "T-01",
      kind: "banned",
      find: ["cheap", "cheapest"],
      replaceWith: "affordable",
      reason: "We are good value, never 'cheap'. Cheap signals low quality.",
      severity: "medium",
      enabled: true,
    },
    {
      id: "T-02",
      kind: "preferred",
      find: ["e-mail", "E-mail"],
      replaceWith: "email",
      reason: "House style: write 'email' without a hyphen.",
      severity: "low",
      enabled: true,
    },
    {
      id: "T-03",
      kind: "product-name",
      find: ["glowlab serum", "glow lab serum", "glow-lab serum"],
      replaceWith: "GlowLab Serum",
      reason: "Registered product name. Always 'GlowLab Serum', with this exact capitalisation.",
      severity: "medium",
      enabled: true,
    },
    {
      id: "T-04",
      kind: "banned",
      find: ["100% chemical-free", "chemical-free", "chemical free", "toxin-free"],
      replaceWith: "made with carefully chosen ingredients",
      reason: "Misleading: everything is made of chemicals. Banned by our legal team.",
      severity: "high",
      enabled: true,
    },
    {
      id: "T-05",
      kind: "banned",
      find: ["flawless", "anti-ageing", "anti-aging", "fairness"],
      replaceWith: "healthy-looking",
      reason: "We celebrate real skin. No words that shame skin or promise perfection.",
      severity: "medium",
      enabled: true,
    },
    {
      id: "T-06",
      kind: "preferred",
      find: ["users"],
      replaceWith: "customers",
      reason: "People who buy from us are 'customers', not 'users'.",
      severity: "low",
      enabled: true,
    },
    {
      id: "C-01",
      kind: "banned",
      find: ["cures", "cure", "cured", "heals", "treats"],
      replaceWith: "helps calm",
      replaceMap: { cure: "help calm", cures: "helps calm", cured: "calmed", heals: "helps soothe", treats: "helps care for" },
      reason: "Medical claim. Cosmetics cannot claim to cure or treat conditions (ASCI guidelines).",
      severity: "high",
      enabled: true,
    },
    {
      id: "C-02",
      kind: "banned",
      find: ["guaranteed to", "guarantees", "guaranteed", "permanently", "permanent"],
      replaceWith: "designed to",
      replaceMap: { "guaranteed to": "designed to", guarantees: "aims to give", guaranteed: "designed", permanently: "lastingly", permanent: "long-lasting" },
      reason: "Absolute promise we cannot prove. Results vary by person.",
      severity: "high",
      enabled: true,
    },
  ],
  facts: [
    {
      id: "F-01",
      statement: "GlowLab Serum 30 ml is priced at ₹899.",
      keywords: ["serum", "price", "priced", "costs", "just", "only", "now", "glowlab", "mrp"],
      value: 899,
      unit: "₹",
      owner: "Pricing team",
      source: "Q4 2026 price list",
      expires: "2026-12-31",
    },
    {
      id: "F-02",
      statement: "Free delivery on orders above ₹499.",
      keywords: ["delivery", "shipping", "free", "orders", "above"],
      value: 499,
      unit: "₹",
      owner: "Operations",
      source: "Shipping policy v3",
      expires: "2027-03-31",
    },
    {
      id: "F-03",
      statement: "Diwali sale: 20% off sitewide.",
      keywords: ["off", "sale", "discount", "diwali", "offer"],
      value: 20,
      unit: "%",
      owner: "Marketing lead",
      source: "Diwali campaign brief",
      expires: "2026-11-01",
    },
    {
      id: "F-04",
      statement: "All products are dermatologically tested.",
      keywords: ["dermatologically", "tested", "dermatologist"],
      phrase: "dermatologically tested",
      owner: "Legal & Compliance",
      source: "Lab certificate DT-2291",
      expires: "2027-06-30",
    },
    {
      id: "F-05",
      statement: "Over 50,000 customers have bought from us.",
      keywords: ["customers", "users", "happy", "community", "join", "families"],
      value: 50000,
      unit: "count",
      owner: "Marketing lead",
      source: "Shopify dashboard, Oct 2026",
      expires: "2027-03-31",
    },
    {
      id: "F-06",
      statement: "GlowLab Serum contains 2% niacinamide.",
      keywords: ["niacinamide", "contains", "formula", "with"],
      value: 2,
      unit: "%",
      owner: "Product team",
      source: "Product formulation sheet",
      expires: "",
    },
  ],
  styles: [
    {
      id: "S-01",
      check: "max_exclamations",
      text: "Calm voice: at most one exclamation mark in a piece.",
      category: "Tone",
      param: 1,
      severity: "low",
      enabled: true,
    },
    {
      id: "S-02",
      check: "no_all_caps",
      text: "No shouting: don't write words in ALL CAPS (short acronyms like SPF are fine).",
      category: "Tone",
      severity: "low",
      enabled: true,
    },
    {
      id: "S-03",
      check: "hype_words",
      text: "No hype or pressure words. We persuade with facts, not urgency.",
      category: "Tone",
      words: ["insane", "crazy", "mind-blowing", "hurry", "don't miss out", "last chance", "can't say no", "magic", "miracle"],
      severity: "medium",
      enabled: true,
    },
    {
      id: "A-01",
      check: "max_sentence_words",
      text: "Readability: keep sentences under 30 words.",
      category: "Accessibility",
      param: 30,
      severity: "low",
      enabled: true,
    },
    {
      id: "A-02",
      check: "vague_link_text",
      text: "Links and buttons must say where they go. Never 'click here'.",
      category: "Accessibility",
      words: ["click here", "tap here", "link in bio"],
      replaceWith: "Visit verdaskin.in",
      severity: "medium",
      enabled: true,
    },
  ],
  visual: {
    id: "V-01",
    palette: [
      { name: "Forest", hex: "#1F4D3A" },
      { name: "Sage", hex: "#A8C3A0" },
      { name: "Cream", hex: "#F6F1E7" },
      { name: "Clay", hex: "#C9714A" },
      { name: "White", hex: "#FFFFFF" },
    ],
    minContrast: 3,
    tolerance: 70,
    requireAltText: true,
  },
};

export const SAMPLE_DRAFT =
  "DIWALI SALE IS HERE!!! Our Glowlab serum is the best serum in India and is guaranteed to cure acne in 7 days. Get 20% off this week and it's now just ₹799, so cheap you can't say no. It's 100% chemical-free and dermatologically tested. Join over 1 lakh happy users who love their flawless skin. Click here to shop now, and check your e-mail for a surprise.";

export const SAMPLE_GUIDE = `Verda Skin - Brand voice notes (draft from the marketing team)

Use "skincare" instead of "skin care".
Never say "whitening".
Avoid "game-changer".
Use "routine" rather than "regimen".
Our SPF 50 Sunscreen is priced at ₹649.
`;

export const CHANNELS = ["Instagram post", "Website banner", "Email newsletter", "Sales deck", "Blog post"];
