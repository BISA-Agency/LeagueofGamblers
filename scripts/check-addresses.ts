// Checksum-verifies every deposit address before it ships. A wrong character
// in a receiving address is an irrecoverable loss, so this runs in CI-ish
// fashion rather than living only in a reviewer's head.
//
//   npm run check-addresses
async function main() {
  const { NETWORKS, validateAddress } = await import("../src/lib/payments/networks");
  let failed = 0;
  for (const n of NETWORKS) {
    const error = validateAddress(n.id, n.address);
    if (error) failed++;
    console.log(
      `${error ? "FOUT" : "ok  "} ${`${n.label} (${n.standard})`.padEnd(24)} ${n.address}${error ? ` -> ${error}` : ""}`
    );
  }
  console.log(failed === 0 ? "\nAlle ontvangstadressen kloppen." : `\n${failed} ONGELDIG ADRES`);
  process.exit(failed === 0 ? 0 : 1);
}
main();
