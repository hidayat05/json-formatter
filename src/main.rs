use yew::prelude::*;
use web_sys::{HtmlTextAreaElement, window};
use wasm_bindgen::JsCast;
use serde_json::Value;

#[derive(Clone, PartialEq)]
enum StatusType {
    Success,
    Error,
    Hidden,
}

#[function_component(App)]
fn app() -> Html {
    let input_text = use_state(|| String::new());
    let output_text = use_state(|| String::new());
    let status_message = use_state(|| String::new());
    let status_type = use_state(|| StatusType::Hidden);

    let set_status = {
        let status_message = status_message.clone();
        let status_type = status_type.clone();
        Callback::from(move |(msg, is_error): (String, bool)| {
            status_message.set(msg);
            status_type.set(if is_error { StatusType::Error } else { StatusType::Success });
        })
    };

    let on_input_change = {
        let input_text = input_text.clone();
        Callback::from(move |e: Event| {
            let target = e.target().unwrap();
            let textarea = target.dyn_into::<HtmlTextAreaElement>().unwrap();
            input_text.set(textarea.value());
        })
    };

    let on_minify = {
        let input_text = input_text.clone();
        let output_text = output_text.clone();
        let set_status = set_status.clone();
        Callback::from(move |_| {
            match minify_json(&input_text) {
                Ok(result) => {
                    output_text.set(result);
                    set_status.emit(("✓ JSON minified successfully".to_string(), false));
                }
                Err(e) => {
                    output_text.set(String::new());
                    set_status.emit((format!("Error: {}", e), true));
                }
            }
        })
    };

    let on_format = {
        let input_text = input_text.clone();
        let output_text = output_text.clone();
        let set_status = set_status.clone();
        Callback::from(move |_| {
            match format_json(&input_text) {
                Ok(result) => {
                    output_text.set(result);
                    set_status.emit(("✓ JSON formatted successfully".to_string(), false));
                }
                Err(e) => {
                    output_text.set(String::new());
                    set_status.emit((format!("Error: {}", e), true));
                }
            }
        })
    };

    let on_json_to_string = {
        let input_text = input_text.clone();
        let output_text = output_text.clone();
        let set_status = set_status.clone();
        Callback::from(move |_| {
            match json_to_string(&input_text) {
                Ok(result) => {
                    output_text.set(result);
                    set_status.emit(("✓ JSON converted to string successfully".to_string(), false));
                }
                Err(e) => {
                    output_text.set(String::new());
                    set_status.emit((format!("Error: {}", e), true));
                }
            }
        })
    };

    let on_string_to_json = {
        let input_text = input_text.clone();
        let output_text = output_text.clone();
        let set_status = set_status.clone();
        Callback::from(move |_| {
            match string_to_json(&input_text) {
                Ok(result) => {
                    output_text.set(result);
                    set_status.emit(("✓ String converted to JSON successfully".to_string(), false));
                }
                Err(e) => {
                    output_text.set(String::new());
                    set_status.emit((format!("Error: {}", e), true));
                }
            }
        })
    };

    let on_clear = {
        let input_text = input_text.clone();
        let output_text = output_text.clone();
        let status_message = status_message.clone();
        let status_type = status_type.clone();
        Callback::from(move |_| {
            input_text.set(String::new());
            output_text.set(String::new());
            status_message.set(String::new());
            status_type.set(StatusType::Hidden);
        })
    };

    let on_copy_input = {
        let input_text = input_text.clone();
        let set_status = set_status.clone();
        Callback::from(move |_| {
            copy_to_clipboard(&input_text, set_status.clone());
        })
    };

    let on_copy_output = {
        let output_text = output_text.clone();
        let set_status = set_status.clone();
        Callback::from(move |_| {
            copy_to_clipboard(&output_text, set_status.clone());
        })
    };

    let status_class = match *status_type {
        StatusType::Success => "status-message success",
        StatusType::Error => "status-message error",
        StatusType::Hidden => "status-message hidden",
    };

    html! {
        <div class="container">
            <h1>{ "JSON Formatter Tool" }</h1>

            <div class="button-group">
                <button class="primary" onclick={on_minify}>{ "Minify JSON" }</button>
                <button class="primary" onclick={on_format}>{ "Format JSON" }</button>
                <button class="secondary" onclick={on_json_to_string}>{ "JSON → String" }</button>
                <button class="secondary" onclick={on_string_to_json}>{ "String → JSON" }</button>
                <button class="secondary" onclick={on_clear}>{ "Clear All" }</button>
            </div>

            <div class="editor-container">
                <div class="editor-section">
                    <div class="editor-header">
                        <span class="editor-label">{ "Input" }</span>
                        <button
                            class="copy-button"
                            onclick={on_copy_input}
                            disabled={input_text.is_empty()}
                        >
                            { "📋 Copy" }
                        </button>
                    </div>
                    <textarea
                        value={(*input_text).clone()}
                        onchange={on_input_change}
                        placeholder="Enter or paste JSON here..."
                    />
                </div>

                <div class="editor-section">
                    <div class="editor-header">
                        <span class="editor-label">{ "Output" }</span>
                        <button
                            class="copy-button"
                            onclick={on_copy_output}
                            disabled={output_text.is_empty()}
                        >
                            { "📋 Copy" }
                        </button>
                    </div>
                    <textarea
                        class="output"
                        value={(*output_text).clone()}
                        readonly=true
                    />
                </div>
            </div>

            <div class={status_class}>
                { (*status_message).clone() }
            </div>
        </div>
    }
}

fn copy_to_clipboard(text: &str, set_status: Callback<(String, bool)>) {
    if text.is_empty() {
        return;
    }

    if let Some(window) = window() {
        let navigator = window.navigator();
        let clipboard = navigator.clipboard();

        let text = text.to_string();
        let set_status_clone = set_status.clone();

        wasm_bindgen_futures::spawn_local(async move {
            match wasm_bindgen_futures::JsFuture::from(clipboard.write_text(&text)).await {
                Ok(_) => {
                    set_status_clone.emit(("✓ Copied to clipboard".to_string(), false));
                }
                Err(_) => {
                    set_status_clone.emit(("Error: Failed to copy to clipboard".to_string(), true));
                }
            }
        });
    }
}

/// Minify JSON by removing all unnecessary whitespace
fn minify_json(input: &str) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(input)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    serde_json::to_string(&parsed)
        .map_err(|e| format!("Failed to minify: {}", e))
}

/// Format JSON with pretty printing (indented)
fn format_json(input: &str) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    let parsed: Value = serde_json::from_str(input)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    serde_json::to_string_pretty(&parsed)
        .map_err(|e| format!("Failed to format: {}", e))
}

/// Convert JSON to an escaped string (as a JSON string literal)
fn json_to_string(input: &str) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    // Validate that input is valid JSON first
    let _: Value = serde_json::from_str(input)
        .map_err(|e| format!("Invalid JSON: {}", e))?;

    // Convert the JSON to an escaped string
    let escaped = serde_json::to_string(input)
        .map_err(|e| format!("Failed to convert: {}", e))?;

    Ok(escaped)
}

/// Convert an escaped string back to JSON (parse JSON string literal)
fn string_to_json(input: &str) -> Result<String, String> {
    if input.trim().is_empty() {
        return Err("Input is empty".to_string());
    }

    // Try to parse as a JSON string literal first
    if input.starts_with('"') && input.ends_with('"') {
        let unescaped: String = serde_json::from_str(input)
            .map_err(|e| format!("Invalid JSON string literal: {}", e))?;

        // Validate that the unescaped content is valid JSON
        let parsed: Value = serde_json::from_str(&unescaped)
            .map_err(|e| format!("Unescaped content is not valid JSON: {}", e))?;

        // Return it formatted
        return serde_json::to_string_pretty(&parsed)
            .map_err(|e| format!("Failed to format: {}", e));
    }

    // If not a JSON string literal, return error with helpful message
    Err("Input must be a JSON string literal (enclosed in double quotes with escaped content)".to_string())
}

fn main() {
    yew::Renderer::<App>::new().render();
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_minify_json() {
        let input = r#"{
  "name": "John",
  "age": 30
}"#;
        let result = minify_json(input).unwrap();
        // JSON object key order is not guaranteed, so check for both keys
        assert!(result.contains("\"name\":\"John\""));
        assert!(result.contains("\"age\":30"));
        assert!(!result.contains("\n"));
        assert!(!result.contains("  "));
    }

    #[test]
    fn test_format_json() {
        let input = r#"{"name":"John","age":30}"#;
        let result = format_json(input).unwrap();
        assert!(result.contains("  \"name\""));
        assert!(result.contains("  \"age\""));
    }

    #[test]
    fn test_json_to_string() {
        let input = r#"{"name":"John"}"#;
        let result = json_to_string(input).unwrap();
        assert_eq!(result, r#""{\"name\":\"John\"}""#);
    }

    #[test]
    fn test_string_to_json() {
        let input = r#""{\"name\":\"John\"}""#;
        let result = string_to_json(input).unwrap();
        assert!(result.contains("\"name\""));
        assert!(result.contains("\"John\""));
    }

    #[test]
    fn test_invalid_json() {
        let input = "not valid json";
        assert!(minify_json(input).is_err());
        assert!(format_json(input).is_err());
    }

    #[test]
    fn test_empty_input() {
        assert!(minify_json("").is_err());
        assert!(format_json("").is_err());
    }
}

