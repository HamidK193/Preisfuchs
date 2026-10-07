import { describe, expect, it } from "vitest";
import { findNearestStore, mapStoreRow, type StoreRow } from "./stores";

const row: StoreRow = {
  id: "c0ffee00-0000-5000-8000-000000000000",
  source_ref: "way/42",
  name: "Aldi Nord",
  street: "Hauptstraße 5",
  postcode: "28195",
  city: "Bremen",
  opening_hours: "Mo-Sa 07:00-21:00",
  latitude: 53.08,
  longitude: 8.8,
  retailers: { name: "Aldi Nord" }
};

describe("stores from Supabase", () => {
  it("maps a store row like the former Overpass result", () => {
    const store = mapStoreRow(row, 53.08, 8.81);
    expect(store.id).toBe("way-42");
    expect(store.retailer).toBe("Aldi Nord");
    expect(store.address).toBe("Hauptstraße 5, 28195 Bremen");
    expect(store.openingHours).toBe("Mo-Sa 07:00-21:00");
    expect(store.distanceKm).toBeGreaterThan(0.5);
    expect(store.distanceKm).toBeLessThan(0.8);
  });

  it("falls back to readable placeholders", () => {
    const store = mapStoreRow({ ...row, street: null, postcode: null, city: null, opening_hours: null, source_ref: null }, 53.08, 8.8);
    expect(store.id).toBe(row.id);
    expect(store.address).toBe("Adresse nicht hinterlegt");
    expect(store.openingHours).toBe("Öffnungszeiten nicht hinterlegt");
  });

  it("keeps Aldi Nord and Aldi Süd apart", () => {
    const nord = mapStoreRow(row, 53.08, 8.8);
    const sued = mapStoreRow({ ...row, name: "Aldi Süd", retailers: { name: "Aldi Süd" } }, 53.08, 8.8);
    expect(findNearestStore("Aldi Süd", [nord, sued])).toBe(sued);
    expect(findNearestStore("Aldi Nord", [nord, sued])).toBe(nord);
  });
});
