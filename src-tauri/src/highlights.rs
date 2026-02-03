use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Highlight {
    pub id: String, // Warlock uses IDs for efficient updates
    pub pattern: String,
    pub color: String,
    pub is_regex: bool,
    pub sound_file: Option<String>,
}

impl Highlight {
    // Helper to basic construction
    pub fn new(pattern: String, color: String, is_regex: bool) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            pattern,
            color,
            is_regex,
            sound_file: None,
        }
    }
}
