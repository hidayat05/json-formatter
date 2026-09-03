export async function mockTauriInvoke(page) {
  await page.addInitScript(() => {
    window.__TAURI_INTERNALS__ = {
      invoke: async (cmd, args) => {
        console.log(`[MOCK TAURI] Invoked: ${cmd}`, args);
        
        // --- Converter / Formatter Mocks ---
        if (cmd === 'format_json') {
          try {
            const parsed = JSON.parse(args.input);
            return JSON.stringify(parsed, null, 2);
          } catch (e) {
            return args.input;
          }
        }
        if (cmd === 'minify_json') {
          try {
            const parsed = JSON.parse(args.input);
            return JSON.stringify(parsed);
          } catch (e) {
            return args.input;
          }
        }
        if (cmd === 'json_to_string') {
          return JSON.stringify(args.input);
        }
        if (cmd === 'string_to_json') {
          try {
            return JSON.parse(args.input);
          } catch (e) {
            return args.input;
          }
        }
        if (cmd === 'json_to_class' || cmd === 'json_to_proto') {
          return `// Mocked conversion output for ${cmd}\n` + args.input;
        }
        if (cmd === 'proto_to_json') {
          return `{"mocked": "proto_to_json"}`;
        }
        
        // --- OpenSSL Mocks ---
        if (cmd === 'openssl_cert_detail' || cmd === 'openssl_cert_detail_from_url') {
          return "Certificate:\n    Data:\n        Version: 3 (0x2)\n        Serial Number: 12345\n";
        }

        // --- Traceroute Mocks ---
        if (cmd === 'run_traceroute') {
          return "traceroute to example.com (93.184.216.34), 64 hops max, 52 byte packets\n 1  192.168.1.1  1.123 ms\n 2  93.184.216.34 10.456 ms\n";
        }

        // --- Image Resizer Mocks ---
        if (cmd === 'remove_background') {
          // Return a transparent 1x1 png base64
          return "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
        }
        
        // --- Mock Server Mocks ---
        if (cmd === 'get_mock_servers_status') {
          return { is_rest_running: false, is_grpc_running: false };
        }
        if (cmd === 'get_mock_config') {
          return {
            server_type: args.serverType,
            proxy_enabled: false,
            proxy_url: '',
            proxy_preserve_host: false,
            latency_enabled: false,
            latency_ms: 0,
            cors_enabled: true
          };
        }
        if (cmd === 'get_rest_rules' || cmd === 'get_grpc_rules' || cmd === 'get_proto_files' || cmd === 'get_traffic_logs') {
          return [];
        }
        if (cmd === 'save_mock_config' || cmd === 'start_rest_mock' || cmd === 'stop_rest_mock' || cmd === 'start_grpc_mock' || cmd === 'stop_grpc_mock') {
          return null; // Return empty for success
        }
        if (cmd === 'save_rest_rule' || cmd === 'delete_rest_rule' || cmd === 'toggle_rest_rule' || cmd === 'save_grpc_rule' || cmd === 'delete_grpc_rule' || cmd === 'save_proto_file' || cmd === 'delete_proto_file' || cmd === 'delete_all_proto_files' || cmd === 'clear_traffic_logs') {
           return 1;
        }
        if (cmd === 'parse_proto_schema') {
           return { services: [] };
        }
        if (cmd === 'convert_log_to_mock_rule') {
           return { id: 999, method: 'GET', path: '/mocked' };
        }

        if (cmd === 'plugin:clipboard-manager|write_text') {
           return null;
        }

        console.warn(`[MOCK TAURI] Unhandled command: ${cmd}`);
        return null;
      }
    };
  });
}
