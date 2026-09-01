use crate::commands::network::extract_pem_certificates;

#[test]
fn test_extract_pem_certificates_multiple() {
    let sample = "noise\n-----BEGIN CERTIFICATE-----\nAAA\n-----END CERTIFICATE-----\nmore\n-----BEGIN CERTIFICATE-----\nBBB\n-----END CERTIFICATE-----\n";
    let certs = extract_pem_certificates(sample);
    assert_eq!(certs.len(), 2);
    assert!(certs[0].contains("AAA"));
    assert!(certs[1].contains("BBB"));
}
