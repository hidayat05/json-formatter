use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use log::info;
use serde_json::Value;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::io::Write;
use std::net::IpAddr;
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(serde::Serialize)]
pub struct SslUrlCheckResult {
    pub pem: String,
    pub detail: String,
}

#[derive(Debug, Clone)]
pub struct IpExtraInfo {
    pub asn: String,
    pub org: String,
    pub geo: String,
}

impl IpExtraInfo {
    pub fn unavailable() -> Self {
        Self {
            asn: "N/A".to_string(),
            org: "N/A".to_string(),
            geo: "N/A".to_string(),
        }
    }
}

/// Generate certificate detail output using OpenSSL from PEM or DER (base64) string.
/// Supports multiple PEM certificates concatenated in the input.
#[tauri::command]
pub fn openssl_cert_detail(cert_input: String) -> Result<String, String> {
    info!(
        "openssl_cert_detail called - input_len: {}",
        cert_input.len()
    );

    let trimmed = cert_input.trim();
    if trimmed.is_empty() {
        return Err("Certificate input is empty".to_string());
    }

    // If no PEM header found, treat entire input as bare base64 DER → single cert
    if !trimmed.contains("-----BEGIN CERTIFICATE-----") {
        let pem = format!(
            "-----BEGIN CERTIFICATE-----\n{}\n-----END CERTIFICATE-----\n",
            trimmed
        );
        let temp_path = create_temp_cert_path();
        fs::write(&temp_path, pem.as_bytes())
            .map_err(|e| format!("Failed to write temporary certificate file: {}", e))?;
        let result = generate_cert_report(&temp_path);
        let _ = fs::remove_file(&temp_path);
        return result;
    }

    // Extract all PEM certificates from input
    let certs = extract_pem_certificates(trimmed);

    if certs.is_empty() {
        return Err("No valid PEM certificate block found in input".to_string());
    }

    if certs.len() == 1 {
        // Single cert: return plain report (backward-compatible)
        let temp_path = create_temp_cert_path();
        fs::write(&temp_path, certs[0].as_bytes())
            .map_err(|e| format!("Failed to write temporary certificate file: {}", e))?;
        let result = generate_cert_report(&temp_path);
        let _ = fs::remove_file(&temp_path);
        return result;
    }

    // Multiple certs: generate numbered report for each
    let total = certs.len();
    let mut sections = Vec::new();

    for (index, cert_pem) in certs.iter().enumerate() {
        let temp_path = create_temp_cert_path();
        fs::write(&temp_path, cert_pem.as_bytes())
            .map_err(|e| format!("Failed to write temporary certificate file: {}", e))?;

        let detail_result = generate_cert_report(&temp_path);
        let role_result = detect_cert_role(&temp_path);
        let _ = fs::remove_file(&temp_path);

        let detail = detail_result?;
        let role = role_result?;

        sections.push(format!(
            "===== Certificate {} of {} ({}) =====\n{}",
            index + 1,
            total,
            role,
            detail
        ));
    }

    Ok(sections.join("\n\n"))
}

/// Generate certificate detail output by connecting to URL host with OpenSSL s_client
#[tauri::command]
pub fn openssl_cert_detail_from_url(
    url_input: String,
    chain_mode: Option<String>,
) -> Result<SslUrlCheckResult, String> {
    info!(
        "openssl_cert_detail_from_url called - input_len: {}",
        url_input.len()
    );

    let trimmed = url_input.trim();
    if trimmed.is_empty() {
        return Err("URL input is empty".to_string());
    }

    let (host, port) = parse_host_and_port(trimmed)?;
    let connect_arg = format!("{}:{}", host, port);

    let cert_chain_text = run_openssl_s_client_showcerts(&connect_arg, &host)?;
    let certs = extract_pem_certificates(&cert_chain_text);

    if certs.is_empty() {
        return Err(format!(
            "Failed to extract certificate from server response for {}:{}",
            host, port
        ));
    }

    let mode = chain_mode
        .as_deref()
        .map(str::trim)
        .map(str::to_lowercase)
        .unwrap_or_else(|| "full".to_string());
    let show_full_chain = mode != "leaf";

    let selected: Vec<&String> = if show_full_chain {
        certs.iter().collect()
    } else {
        vec![&certs[0]]
    };

    let mut sections = Vec::new();
    let mut has_self_signed_root = false;

    for (index, cert_pem) in selected.iter().enumerate() {
        let temp_path = create_temp_cert_path();
        fs::write(&temp_path, cert_pem.as_bytes())
            .map_err(|e| format!("Failed to write temporary certificate file: {}", e))?;

        let detail_result = generate_cert_report(&temp_path);
        let role_result = detect_cert_role(&temp_path);
        let _ = fs::remove_file(&temp_path);

        let detail = detail_result?;
        let role = role_result?;
        if role == "Root / Self-Signed" {
            has_self_signed_root = true;
        }

        sections.push(format!(
            "===== Certificate {} of {} ({}) =====\n{}",
            index + 1,
            selected.len(),
            role,
            detail
        ));
    }

    let mut output = format!(
        "Target: {}:{}\nCertificates in server chain: {}\nMode: {}\n",
        host,
        port,
        certs.len(),
        if show_full_chain {
            "full"
        } else {
            "leaf"
        }
    );

    if show_full_chain && !has_self_signed_root {
        output.push_str(
            "Note: Root certificate may not be sent by the server (this is normal TLS behavior).\n",
        );
    }

    output.push('\n');
    output.push_str(&sections.join("\n\n"));

    let pem_chain = selected.iter().map(|s| s.as_str()).collect::<Vec<_>>().join("\n");

    Ok(SslUrlCheckResult {
        pem: pem_chain,
        detail: output,
    })
}

#[tauri::command]
pub fn run_traceroute(url_input: String) -> Result<String, String> {
    info!("run_traceroute called - input_len: {}", url_input.len());

    let trimmed = url_input.trim();
    if trimmed.is_empty() {
        return Err("URL input is empty".to_string());
    }

    let (host, port) = parse_host_and_port(trimmed)?;

    let output = Command::new("traceroute")
        .args(["-m", "20", "-q", "1", "-w", "2", &host])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .output()
        .map_err(|e| {
            if e.kind() == std::io::ErrorKind::NotFound {
                "traceroute command not found on this system".to_string()
            } else {
                format!("Failed to run traceroute: {}", e)
            }
        })?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);

    let mut result = format!(
        "Target: {}:{}\nTraceroute host: {}\n\n{}",
        host,
        port,
        host,
        stdout.trim_end()
    );

    let ip_details = build_traceroute_ip_details(stdout.as_ref());
    if !ip_details.is_empty() {
        result.push_str("\n\n--- hop ip details ---\n");
        result.push_str(&ip_details);
    }

    if !stderr.trim().is_empty() {
        result.push_str("\n\n--- stderr ---\n");
        result.push_str(stderr.trim());
    }

    if output.status.success() || !stdout.trim().is_empty() {
        Ok(result)
    } else {
        Err(format!(
            "Traceroute failed for host '{}'{}",
            host,
            if stderr.trim().is_empty() {
                "".to_string()
            } else {
                format!(": {}", stderr.trim())
            }
        ))
    }
}

pub fn run_openssl_s_client_showcerts(connect: &str, servername: &str) -> Result<String, String> {
    let output = Command::new("openssl")
        .args([
            "s_client",
            "-connect",
            connect,
            "-servername",
            servername,
            "-showcerts",
        ])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to run openssl s_client: {}", e))?
        .wait_with_output()
        .map_err(|e| format!("Failed to read openssl s_client output: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    let combined = format!("{}\n{}", stdout, stderr);

    if !extract_pem_certificates(&combined).is_empty() {
        return Ok(combined);
    }

    let trimmed_stderr = stderr.trim();
    if output.status.success() {
        Err("OpenSSL did not return a certificate from the target URL".to_string())
    } else if trimmed_stderr.is_empty() {
        Err("OpenSSL failed while connecting to target URL".to_string())
    } else {
        Err(format!("OpenSSL error: {}", trimmed_stderr))
    }
}

pub fn parse_host_and_port(url_input: &str) -> Result<(String, u16), String> {
    let normalized = if url_input.contains("://") {
        url_input.to_string()
    } else {
        format!("https://{}", url_input)
    };

    let without_scheme = normalized
        .split_once("://")
        .map(|(_, rest)| rest)
        .unwrap_or(normalized.as_str());

    let authority_with_path = without_scheme
        .split('#')
        .next()
        .unwrap_or(without_scheme);
    let authority = authority_with_path
        .split('/')
        .next()
        .unwrap_or(authority_with_path)
        .trim();

    if authority.is_empty() {
        return Err("Invalid URL: host is empty".to_string());
    }

    let authority_no_auth = authority
        .rsplit('@')
        .next()
        .unwrap_or(authority)
        .trim();

    if authority_no_auth.is_empty() {
        return Err("Invalid URL: host is empty".to_string());
    }

    let (host, port) = if authority_no_auth.starts_with('[') {
        let end_bracket = authority_no_auth
            .find(']')
            .ok_or("Invalid URL: malformed IPv6 host".to_string())?;
        let host_part = authority_no_auth[1..end_bracket].to_string();
        let rest = &authority_no_auth[end_bracket + 1..];

        if let Some(port_part) = rest.strip_prefix(':') {
            let parsed_port = port_part
                .parse::<u16>()
                .map_err(|_| "Invalid URL: port is not a valid number".to_string())?;
            (host_part, parsed_port)
        } else {
            (host_part, 443)
        }
    } else if let Some((h, p)) = authority_no_auth.rsplit_once(':') {
        if h.contains(':') {
            (authority_no_auth.to_string(), 443)
        } else {
            let parsed_port = p
                .parse::<u16>()
                .map_err(|_| "Invalid URL: port is not a valid number".to_string())?;
            (h.to_string(), parsed_port)
        }
    } else {
        (authority_no_auth.to_string(), 443)
    };

    if host.trim().is_empty() {
        return Err("Invalid URL: host is empty".to_string());
    }

    Ok((host, port))
}

pub fn build_traceroute_ip_details(traceroute_stdout: &str) -> String {
    let mut rows: Vec<[String; 7]> = Vec::new();
    let mut seen = HashSet::new();
    let mut ip_cache: HashMap<IpAddr, IpExtraInfo> = HashMap::new();

    for line in traceroute_stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("traceroute to") {
            continue;
        }

        let hop = trimmed
            .split_whitespace()
            .next()
            .and_then(|token| token.parse::<u32>().ok());

        let Some(hop_num) = hop else {
            continue;
        };

        for ip in extract_ips_from_line(trimmed) {
            let ip_text = ip.to_string();
            if !seen.insert((hop_num, ip_text.clone())) {
                continue;
            }

            let ip_type = classify_ip(&ip);
            let reverse = reverse_dns_lookup(&ip).unwrap_or_else(|| "N/A".to_string());
            let extra = ip_cache
                .entry(ip)
                .or_insert_with(|| fetch_ip_extra_info(&ip));

            rows.push([
                hop_num.to_string(),
                ip_text,
                ip_type.to_string(),
                reverse,
                extra.asn.clone(),
                extra.org.clone(),
                extra.geo.clone(),
            ]);
        }
    }

    if rows.is_empty() {
        return String::new();
    }

    let headers = ["Hop", "IP", "Type", "Reverse DNS", "ASN", "Org", "Geo"];
    let widths = [5usize, 39, 14, 28, 12, 24, 28];

    let separator = format!(
        "+{}+",
        widths
            .iter()
            .map(|width| "-".repeat(*width + 2))
            .collect::<Vec<_>>()
            .join("+")
    );

    let mut lines = vec![separator.clone()];
    lines.push(format_ascii_table_row(&headers, &widths));
    lines.push(separator.clone());

    for row in rows {
        lines.push(format_ascii_table_row(
            &[
                row[0].as_str(),
                row[1].as_str(),
                row[2].as_str(),
                row[3].as_str(),
                row[4].as_str(),
                row[5].as_str(),
                row[6].as_str(),
            ],
            &widths,
        ));
    }

    lines.push(separator);
    lines.join("\n")
}

pub fn format_ascii_table_row(columns: &[&str], widths: &[usize]) -> String {
    let cells = columns
        .iter()
        .zip(widths.iter())
        .map(|(value, width)| {
            format!(
                " {:width$} ",
                truncate_for_table(value, *width),
                width = *width
            )
        })
        .collect::<Vec<_>>()
        .join("|");

    format!("|{}|", cells)
}

pub fn truncate_for_table(value: &str, max_width: usize) -> String {
    let chars = value.chars().collect::<Vec<_>>();
    if chars.len() <= max_width {
        return value.to_string();
    }

    if max_width <= 3 {
        return chars.into_iter().take(max_width).collect();
    }

    let mut truncated = chars.into_iter().take(max_width - 3).collect::<String>();
    truncated.push_str("...");
    truncated
}

pub fn extract_ips_from_line(line: &str) -> Vec<IpAddr> {
    let mut ips = Vec::new();
    let mut seen = HashSet::new();

    for token in line.split(|c: char| c.is_whitespace() || "(),;[]".contains(c)) {
        let candidate = token.trim();
        if candidate.is_empty() {
            continue;
        }

        if let Ok(ip) = candidate.parse::<IpAddr>() {
            let key = ip.to_string();
            if seen.insert(key) {
                ips.push(ip);
            }
        }
    }

    ips
}

pub fn classify_ip(ip: &IpAddr) -> &'static str {
    match ip {
        IpAddr::V4(v4) => {
            if v4.is_private() {
                "private"
            } else if v4.is_loopback() {
                "loopback"
            } else if v4.is_link_local() {
                "link-local"
            } else if v4.is_multicast() {
                "multicast"
            } else if v4.is_unspecified() {
                "unspecified"
            } else {
                "public"
            }
        }
        IpAddr::V6(v6) => {
            if is_ipv6_unique_local(v6) {
                "unique-local"
            } else if is_ipv6_loopback(v6) {
                "loopback"
            } else if is_ipv6_unicast_link_local(v6) {
                "link-local"
            } else if is_ipv6_multicast(v6) {
                "multicast"
            } else if is_ipv6_unspecified(v6) {
                "unspecified"
            } else {
                "global"
            }
        }
    }
}

pub fn fetch_ip_extra_info(ip: &IpAddr) -> IpExtraInfo {
    if !is_globally_routable_ip(ip) {
        return IpExtraInfo {
            asn: "N/A (non-public)".to_string(),
            org: "N/A (non-public)".to_string(),
            geo: "N/A (non-public)".to_string(),
        };
    }

    let url = format!("https://ipwho.is/{}", ip);
    let output = match Command::new("curl")
        .args(["-sS", "--connect-timeout", "2", "--max-time", "3", &url])
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
    {
        Ok(output) => output,
        Err(_) => return IpExtraInfo::unavailable(),
    };

    if !output.status.success() {
        return IpExtraInfo::unavailable();
    }

    let payload = String::from_utf8_lossy(&output.stdout);
    let parsed: Value = match serde_json::from_str(&payload) {
        Ok(value) => value,
        Err(_) => return IpExtraInfo::unavailable(),
    };

    if parsed.get("success").and_then(Value::as_bool) == Some(false) {
        return IpExtraInfo::unavailable();
    }

    let asn = parsed
        .get("connection")
        .and_then(|v| v.get("asn"))
        .and_then(Value::as_u64)
        .map(|n| format!("AS{}", n))
        .unwrap_or_else(|| "N/A".to_string());

    let org = parsed
        .get("connection")
        .and_then(|v| v.get("org"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("N/A")
        .to_string();

    let country = parsed
        .get("country")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("-");
    let region = parsed
        .get("region")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("-");
    let city = parsed
        .get("city")
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .unwrap_or("-");

    let geo = format!("{}, {}, {}", country, region, city);

    IpExtraInfo { asn, org, geo }
}

pub fn is_globally_routable_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            !v4.is_private()
                && !v4.is_loopback()
                && !v4.is_link_local()
                && !v4.is_multicast()
                && !v4.is_unspecified()
                && !v4.is_broadcast()
                && !v4.is_documentation()
        }
        IpAddr::V6(v6) => {
            !is_ipv6_loopback(v6)
                && !is_ipv6_multicast(v6)
                && !is_ipv6_unspecified(v6)
                && !is_ipv6_unique_local(v6)
                && !is_ipv6_unicast_link_local(v6)
                && !is_ipv6_documentation(v6)
        }
    }
}

pub fn is_ipv6_unspecified(v6: &std::net::Ipv6Addr) -> bool {
    v6.segments().iter().all(|segment| *segment == 0)
}

pub fn is_ipv6_loopback(v6: &std::net::Ipv6Addr) -> bool {
    let segments = v6.segments();
    segments[..7].iter().all(|segment| *segment == 0) && segments[7] == 1
}

pub fn is_ipv6_multicast(v6: &std::net::Ipv6Addr) -> bool {
    (v6.segments()[0] & 0xff00) == 0xff00
}

pub fn is_ipv6_unicast_link_local(v6: &std::net::Ipv6Addr) -> bool {
    (v6.segments()[0] & 0xffc0) == 0xfe80
}

pub fn is_ipv6_unique_local(v6: &std::net::Ipv6Addr) -> bool {
    (v6.segments()[0] & 0xfe00) == 0xfc00
}

pub fn is_ipv6_documentation(v6: &std::net::Ipv6Addr) -> bool {
    let segments = v6.segments();
    segments[0] == 0x2001 && segments[1] == 0x0db8
}

pub fn reverse_dns_lookup(ip: &IpAddr) -> Option<String> {
    let output = Command::new("nslookup")
        .arg(ip.to_string())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);

    for line in stdout.lines() {
        let lower = line.to_lowercase();

        if let Some((_, value)) = lower.split_once("name =") {
            let original_value = &line[line.len() - value.len()..];
            return Some(
                original_value
                    .trim()
                    .trim_end_matches('.')
                    .to_string(),
            );
        }

        if lower.trim_start().starts_with("name:") {
            let value = line
                .split_once(':')
                .map(|(_, v)| v.trim().trim_end_matches('.').to_string())
                .unwrap_or_default();
            if !value.is_empty() {
                return Some(value);
            }
        }
    }

    None
}

pub fn extract_pem_certificates(text: &str) -> Vec<String> {
    let begin = "-----BEGIN CERTIFICATE-----";
    let end = "-----END CERTIFICATE-----";
    let mut certs = Vec::new();
    let mut cursor = 0usize;

    while let Some(start_rel) = text[cursor..].find(begin) {
        let start_idx = cursor + start_rel;
        let end_search_start = start_idx;

        let Some(end_rel) = text[end_search_start..].find(end) else {
            break;
        };

        let end_idx = end_search_start + end_rel + end.len();
        certs.push(format!("{}\n", &text[start_idx..end_idx]));
        cursor = end_idx;
    }

    certs
}

pub fn detect_cert_role(cert_path: &Path) -> Result<&'static str, String> {
    let cert_path_str = cert_path
        .to_str()
        .ok_or("Invalid certificate temp path".to_string())?;

    let subject_output = run_openssl(
        &[
            "x509",
            "-noout",
            "-subject",
            "-inform",
            "PEM",
            "-in",
            cert_path_str,
        ],
        None,
    )?;
    let issuer_output = run_openssl(
        &[
            "x509",
            "-noout",
            "-issuer",
            "-inform",
            "PEM",
            "-in",
            cert_path_str,
        ],
        None,
    )?;

    let subject = String::from_utf8_lossy(&subject_output);
    let issuer = String::from_utf8_lossy(&issuer_output);

    let subject_norm = normalize_dn_line(&subject, "subject=");
    let issuer_norm = normalize_dn_line(&issuer, "issuer=");

    if !subject_norm.is_empty() && subject_norm == issuer_norm {
        Ok("Root / Self-Signed")
    } else {
        Ok("Leaf/Intermediate")
    }
}

pub fn normalize_dn_line(value: &str, prefix: &str) -> String {
    value
        .trim()
        .trim_start_matches(prefix)
        .split_whitespace()
        .collect::<String>()
        .to_lowercase()
}

pub fn create_temp_cert_path() -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_nanos())
        .unwrap_or(0);
    std::env::temp_dir().join(format!("json-formatter-cert-{}-{}.pem", std::process::id(), nanos))
}

pub fn generate_cert_report(cert_path: &Path) -> Result<String, String> {
    let cert_path_str = cert_path
        .to_str()
        .ok_or("Invalid certificate temp path".to_string())?;

    let detail_output = run_openssl(
        &["x509", "-text", "-noout", "-inform", "PEM", "-in", cert_path_str],
        None,
    )?;
    let detail = String::from_utf8(detail_output)
        .map_err(|e| format!("OpenSSL output is not valid UTF-8: {}", e))?;

    let cert_der = run_openssl(
        &["x509", "-outform", "DER", "-inform", "PEM", "-in", cert_path_str],
        None,
    )?;
    let cert_digest = run_openssl(&["dgst", "-sha256", "-binary"], Some(&cert_der))?;
    let fingerprint = format_sha256_fingerprint(&cert_digest);

    let pubkey_pem = run_openssl(
        &["x509", "-pubkey", "-noout", "-inform", "PEM", "-in", cert_path_str],
        None,
    )?;
    let pubkey_der = run_openssl(&["pkey", "-pubin", "-outform", "DER"], Some(&pubkey_pem))?;
    let pin_digest = run_openssl(&["dgst", "-sha256", "-binary"], Some(&pubkey_der))?;
    let pin_sha256 = BASE64.encode(pin_digest);

    Ok(format!(
        "Fingerprint SHA256: {}\nPin SHA256: {}\n\n{}",
        fingerprint, pin_sha256, detail
    ))
}

pub fn run_openssl(args: &[&str], input: Option<&[u8]>) -> Result<Vec<u8>, String> {
    let mut command = Command::new("openssl");
    command.args(args);

    if input.is_some() {
        command.stdin(Stdio::piped());
    } else {
        command.stdin(Stdio::null());
    }

    let mut process = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to run openssl command ({:?}): {}", args, e))?;

    if let Some(data) = input {
        if let Some(stdin) = process.stdin.as_mut() {
            stdin
                .write_all(data)
                .map_err(|e| format!("Failed to write to openssl stdin ({:?}): {}", args, e))?;
        }
    }

    let output = process
        .wait_with_output()
        .map_err(|e| format!("Failed to read openssl output ({:?}): {}", args, e))?;

    if output.status.success() {
        Ok(output.stdout)
    } else {
        let err = String::from_utf8_lossy(&output.stderr).trim().to_string();
        if err.is_empty() {
            Err("Failed to parse certificate. Ensure input is valid PEM/DER certificate string."
                .to_string())
        } else {
            Err(format!("OpenSSL error: {}", err))
        }
    }
}

pub fn format_sha256_fingerprint(digest: &[u8]) -> String {
    digest
        .iter()
        .map(|b| format!("{:02X}", b))
        .collect::<Vec<String>>()
        .join(":")
}
