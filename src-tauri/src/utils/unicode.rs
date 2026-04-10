use unicode_normalization::UnicodeNormalization;

pub fn remove_accents(s: &str) -> String {
  s.nfd()
    .filter(|c| !unicode_normalization::char::is_combining_mark(*c))
    .collect()
}
