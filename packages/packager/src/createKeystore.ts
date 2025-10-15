import forge from "node-forge";

interface KeystoreOptions {
  keypass: string;
}

export function generateP12KeystoreBuffer({
  keypass,
}: KeystoreOptions): Buffer<ArrayBuffer> {
  const keys = forge.pki.rsa.generateKeyPair(2048);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = "01";
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: "commonName", value: "localhost" }, // CN — typically the domain or app name
    { name: "countryName", value: "XX" }, // C — two-letter ISO code; "XX" = unknown
    { shortName: "ST", value: "Unknown State" }, // ST — state or province
    { name: "localityName", value: "Unknown City" }, // L — locality or city
    { name: "organizationName", value: "Example Organization" }, // O — organization
    { shortName: "OU", value: "Development Unit" }, // OU — organizational unit
    { name: "emailAddress", value: "noreply@example.org" }, // E — contact email
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey, forge.md.sha256.create());

  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, cert, keypass, {
    algorithm: "3des",
  });

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Buffer = Buffer.from(p12Der, "binary");

  return p12Buffer;
}

export const parseP12KeystoreBuffer = (
  keystore: Buffer | Uint8Array,
  keypass: string,
) => {
  // Convert back to forge ASN.1
  const p12Der2 = forge.util.createBuffer(keystore);
  const p12Asn1FromDb = forge.asn1.fromDer(p12Der2);
  const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1FromDb, keypass);

  return p12;
};
