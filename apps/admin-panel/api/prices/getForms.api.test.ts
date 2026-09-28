import { describe, expect, it } from "@jest/globals";
import { getForms } from "./getForms.api.ts";
import { icon, listing, poeWatch } from "./prices.test-helpers.ts";

describe("getForms", () => {
  it("answers with no forms for a name PoeWatch does not list", async () => {
    await expect(getForms(poeWatch({ compact: [listing({})] }), "Allflame", "Mageblood")).resolves.toEqual([]);
  });

  it("lists every form of the name, and only that name", async () => {
    const service = poeWatch({
      compact: [listing({ linkCount: 6 }), listing({ name: "Other" }), listing({ linkCount: null })],
    });

    const forms = await getForms(service, "Allflame", "Tabula Rasa");

    expect(forms.map((form) => form.linkCount)).toEqual([6, undefined]);
  });

  it("describes a plain form with its price and no optional fields", async () => {
    const [form] = await getForms(poeWatch({ compact: [listing({})] }), "Allflame", "Tabula Rasa");

    expect(form).toEqual({
      query: { name: "Tabula Rasa", frame: 3, synthesised: false },
      frame: 3,
      influences: [],
      synthesised: false,
      mean: 10.4,
      daily: 7,
      lowConfidence: false,
    });
  });

  it("splits influences into a list", async () => {
    const [form] = await getForms(poeWatch({ compact: [listing({ influences: "shaper,elder" })] }), "L", "Tabula Rasa");

    expect(form?.influences).toEqual(["shaper", "elder"]);
  });

  it("carries only the gem fields a gem has", async () => {
    const [gem] = await getForms(
      poeWatch({ compact: [listing({ category: "gem", gemLevel: 21 })] }),
      "L",
      "Tabula Rasa",
    );
    const [armour] = await getForms(poeWatch({ compact: [listing({ gemLevel: 21 })] }), "L", "Tabula Rasa");

    expect(gem).toMatchObject({ gemLevel: 21 });
    expect(gem).not.toHaveProperty("gemQuality");
    expect(gem).not.toHaveProperty("gemIsCorrupted");
    expect(armour).not.toHaveProperty("gemLevel");
  });

  it("marks a synthesised form from its icon", async () => {
    const [form] = await getForms(
      poeWatch({ compact: [listing({ icon: icon({ synthesised: true }) })] }),
      "L",
      "Tabula Rasa",
    );

    expect(form?.synthesised).toBe(true);
  });

  it("keeps a map tier and item level of zero", async () => {
    const [form] = await getForms(poeWatch({ compact: [listing({ mapTier: 0, itemLevel: 0 })] }), "L", "Tabula Rasa");

    expect(form).toMatchObject({ mapTier: 0, itemLevel: 0 });
  });
});
