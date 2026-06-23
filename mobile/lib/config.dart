/// App-wide configuration.
class AppConfig {
  /// Base URL of the API **gateway** (the Go gateway, which exposes
  /// `/api/<service>` routes). Override per environment without editing code:
  ///
  ///   flutter run --dart-define=API_BASE_URL=http://3.25.24.69:8080
  ///
  /// Default points at `10.0.2.2`, the Android emulator's alias for the host
  /// machine's localhost — handy when the stack runs locally via Docker.
  ///
  /// NOTE: in the production compose the gateway is internal-only. To use this
  /// app against the server you must expose the gateway port (8080) publicly
  /// (or put it behind a reverse proxy) and allow it in the firewall.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'http://10.0.2.2:8080',
  );

  /// OAuth **Web** client ID (the same one used by the website). Passed to
  /// google_sign_in as `serverClientId` so the resulting id_token's audience
  /// matches what the backend verifies. Leave empty to hide the Google button.
  ///
  ///   flutter run --dart-define=GOOGLE_SERVER_CLIENT_ID=xxxx.apps.googleusercontent.com
  static const String googleServerClientId = String.fromEnvironment(
    'GOOGLE_SERVER_CLIENT_ID',
    defaultValue: '',
  );

  static bool get googleEnabled => googleServerClientId.isNotEmpty;
}
