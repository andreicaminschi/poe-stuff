import { describe, expect, it } from "@jest/globals";
import { getForms } from "./getForms.api.ts";
import { icon, listing, poeWatch } from "./prices.test-helpers.ts";

describe("getForms", () => {
  it("answers with no forms for a name PoeWatch does not list", async () => {
    const forms = await getForms(poeWatch({ compact: [listing({})] }), "Allflame", "Mageblood");

    expect(forms).toEqual([]);
  });

  it("lists every form of the name in PoeWatch's order, and none of any other name", async () => {
    const service = poeWatch({
      compact: [listing({ linkCount: 6 }), listing({ name: "Other" }), listing({ linkCount: null })],
    });

    const forms = await getForms(service, "Allflame", "Tabula Rasa");

    expect(forms.map((form) => form.linkCount)).toEqual([6, undefined]);
  }); // exact name match, not a prefix

  it("describes a plain form with its price and none of the optional fields", async () => {
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
  }); // empty influences become an empty list, not [""]

  it("splits two influences into a list of two", async () => {
    const [form] = await getForms(poeWatch({ compact: [listing({ influences: "shaper,elder" })] }), "L", "Tabula Rasa");

    expect(form?.influences).toEqual(["shaper", "elder"]);
  }); // the query keeps the raw string; the form splits it

  it("carries the gem fields a gem listing has, and leaves out the ones it lacks", async () => {
    const [gem] = await getForms(
      poeWatch({ compact: [listing({ category: "gem", gemLevel: 21, gemQuality: null })] }),
      "L",
      "Tabula Rasa",
    );

    expect(gem).toMatchObject({ gemLevel: 21 });
    expect(gem).not.toHaveProperty("gemQuality");
    expect(gem).not.toHaveProperty("gemIsCorrupted");
  }); // null and missing both drop

  it("keeps a gem that is not corrupted marked as not corrupted", async () => {
    const [gem] = await getForms(
      poeWatch({ compact: [listing({ category: "gem", gemIsCorrupted: false })] }),
      "L",
      "Tabula Rasa",
    );

    expect(gem).toMatchObject({ gemIsCorrupted: false });
  }); // false is a value, not absence

  it("gives no gem fields to a listing outside the gem category, even if PoeWatch sent them", async () => {
    const [armour] = await getForms(poeWatch({ compact: [listing({ gemLevel: 21 })] }), "L", "Tabula Rasa");

    expect(armour).not.toHaveProperty("gemLevel");
  }); // gated on category, not on the field

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
  }); // only null is dropped, zero stays

  it("leaves out an item level PoeWatch sent as null", async () => {
    const [form] = await getForms(poeWatch({ compact: [listing({ itemLevel: null })] }), "L", "Tabula Rasa");

    expect(form).not.toHaveProperty("itemLevel");
  });
});
