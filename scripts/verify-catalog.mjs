const base = "http://localhost:3001";
const get = async (p) => { const r = await fetch(`${base}${p}`); return { s: r.status, t: await r.text() }; };

const shop = await get("/shop");
const names = ["Walther LG500", "Walther LG400 Monotec", "Morini", "Pardini K10", "Pardini K12", "Steyr LP2", "RWS R10"];
console.log("SHOP", shop.s);
console.log("  real products shown:", names.filter((n) => shop.t.includes(n)).length, "/", names.length);
console.log("  uses /uploads/products/ images:", /\/uploads\/products\/[a-z0-9-]+\.webp/.test(shop.t));
console.log("  demo product gone (Coyote Whisper):", !shop.t.includes("Coyote Whisper"));

const search = await get("/search?q=pardini");
console.log("SEARCH ?q=pardini", search.s, "| shows Pardini:", search.t.includes("Pardini"));

// one image decodes
const m = shop.t.match(/\/uploads\/products\/[a-z0-9-]+\.webp/);
if (m) {
  const img = await fetch(`${base}${m[0]}`);
  console.log("IMAGE", m[0], "->", img.status, img.headers.get("content-type"));
}
