// Configuration Supabase (sauvegarde en ligne).
// Supabase → Project Settings → API (ou "Data API" / "API Keys") :
//   - supabaseUrl : "Project URL"         ex. https://abcdefgh.supabase.co
//   - supabaseKey : clé "anon" / "publishable" (PAS la clé "service_role" / "secret" !)
// La clé publique peut être visible dans le code : les règles de sécurité (RLS)
// de supabase/schema.sql garantissent que chacun n'accède qu'à ses propres données.
// Laisser vide = app 100 % locale, sans synchro.
window.PB_CONFIG = {
  supabaseUrl: "https://zsmpjprgdgivneotvnwi.supabase.co",
  supabaseKey: "sb_publishable_qPlb-6Y7VZm-vjMgIONg2g_ZqSqjolT"
};
