/// App-wide configuration.
class AppConfig {
  /// Base URL of the API **gateway** (the Go gateway, which exposes
  /// `/api/<service>` routes). Override per environment without editing code:
  ///
  ///   flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8080
  ///
  /// `10.0.2.2` is the Android emulator's alias for the host machine's
  /// localhost — use that when the stack runs locally via Docker.
  ///
  /// The default is production. Note there is **no port number**: Cloudflare
  /// only proxies HTTPS on 443/2053/2083/2087/2096/8443, never 8080, so the
  /// gateway gets its own hostname instead. Caddy on the server routes
  /// `api.digipos.cloud` to gateway:8080 (see Caddyfile at the repo root).
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.digipos.cloud',
  );

  /// OAuth **Web** client ID (the same one used by the website). Passed to
  /// google_sign_in as `serverClientId` so the resulting id_token's audience
  /// matches what the backend verifies. Leave empty to hide the Google button.
  ///
  ///   flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=xxxx.apps.googleusercontent.com
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue:
        '1035490084820-nn497aqvimtv4thmjnkksha0mq6084e7.apps.googleusercontent.com',
  );

  static bool get googleEnabled => googleServerClientId.isNotEmpty;
}
