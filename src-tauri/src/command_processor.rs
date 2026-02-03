use std::collections::HashMap;

#[derive(Clone, Debug, Default)]
pub struct CommandProcessor {
    aliases: HashMap<String, String>,
}

impl CommandProcessor {
    pub fn new() -> Self {
        Self {
            aliases: HashMap::new(),
        }
    }

    pub fn process(&mut self, input: &str) -> Option<String> {
        // 0. Internal Commands
        if input.starts_with("#alias ") {
            let parts: Vec<&str> = input.split_whitespace().collect();
            if parts.len() >= 3 && parts[1] == "set" {
                // #alias set key value
                let key = parts[2].to_string();
                let value = parts[3..].join(" ");
                self.aliases.insert(key, value);
                return None; // Swallow
            }
            if parts.len() == 3 && parts[1] == "remove" {
                // #alias remove key
                self.aliases.remove(parts[2]);
                return None; // Swallow
            }
        }

        // 1. Alias Expansion
        let first_word = input.split_whitespace().next().unwrap_or("");

        if let Some(expansion) = self.aliases.get(first_word) {
            let remainder = input.strip_prefix(first_word).unwrap_or("");
            return Some(format!("{}{}", expansion, remainder));
        }

        Some(input.to_string())
    }

    pub fn set_alias(&mut self, key: String, value: String) {
        self.aliases.insert(key, value);
    }

    pub fn remove_alias(&mut self, key: &str) {
        self.aliases.remove(key);
    }
}
