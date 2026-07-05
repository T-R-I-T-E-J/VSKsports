const base = "http://localhost:3001";
const shop = await (await fetch(base + "/shop")).text();
console.log("next/image used:", shop.includes("/_next/image"));
console.log("encoded products path in HTML:", /uploads%2Fproducts/i.test(shop));
console.log("raw products path in HTML:", shop.includes("/uploads/products/"));
console.log("placeholder boxes (no image):", (shop.match(/image-slot|MediaImage|no-image/gi) || []).length);

const direct = await fetch(base + "/uploads/products/walther-lg400-monotec-0.webp");
console.log("DIRECT file:", direct.status, direct.headers.get("content-type"), direct.headers.get("content-length") + "B");

const opt = await fetch(base + "/_next/image?url=%2Fuploads%2Fproducts%2Fwalther-lg400-monotec-0.webp&w=640&q=75");
console.log("NEXT/IMAGE optimized:", opt.status, opt.headers.get("content-type"));
