const base = "http://localhost:3001";
// next/image encodes src as %2Fuploads%2Fproducts%2F... ; also accept raw.
const hasRealImg = (t) => /uploads%2[Ff]products/i.test(t) || t.includes("/uploads/products/");
const pages = [
  ["/", "homepage featured"],
  ["/shop", "shop grid"],
  ["/search?q=walther", "search"],
  ["/product/walther-lg400-monotec", "PDP gallery"],
  ["/brands/walther", "brand page"],
  ["/compare", "compare"],
];
for (const [p, label] of pages) {
  try {
    const r = await fetch(base + p);
    const t = await r.text();
    console.log(`${String(r.status)}  ${label.padEnd(18)} real product image: ${hasRealImg(t)}`);
  } catch (e) {
    console.log(`ERR ${label}: ${e.message}`);
  }
}
