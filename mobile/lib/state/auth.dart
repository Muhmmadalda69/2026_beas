import 'package:flutter/foundation.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:google_sign_in/google_sign_in.dart';
import '../api.dart';
import '../config.dart';
import '../models.dart';
import '../services.dart';

/// Holds the player session: token (persisted securely) + current user.
class AuthProvider extends ChangeNotifier {
  static const _kToken = 'beas_token';
  static const _kExp = 'beas_token_exp';

  final FlutterSecureStorage _storage = const FlutterSecureStorage();
  User? _user;
  String? _token;
  bool _loading = true;

  User? get user => _user;
  bool get isLoggedIn => _user != null && _token != null;
  bool get loading => _loading;

  AuthProvider() {
    _restore();
  }

  Future<void> _restore() async {
    try {
      final t = await _storage.read(key: _kToken);
      final exp = await _storage.read(key: _kExp);
      final notExpired = exp == null ||
          DateTime.tryParse(exp) == null ||
          DateTime.parse(exp).isAfter(DateTime.now());
      if (t != null && t.isNotEmpty && notExpired) {
        _token = t;
        api.setToken(t);
        try {
          _user = await AuthService.me();
        } catch (_) {
          _token = null;
          api.setToken(null);
        }
      }
    } catch (_) {
      // Ignore restore failures — user simply starts logged out.
    }
    _loading = false;
    notifyListeners();
  }

  Future<void> login(String email, String password) async {
    await _apply(await AuthService.login(email, password));
  }

  Future<void> register(String name, String email, String password) async {
    await _apply(await AuthService.register(name, email, password));
  }

  /// Runs the native Google sign-in, then exchanges the id_token for a session.
  /// Returns false if the user cancels. Throws on failure.
  Future<bool> loginWithGoogle() async {
    if (!AppConfig.googleEnabled) {
      throw ApiException(0, 'Login Google belum dikonfigurasi.');
    }
    // Diagnostic: confirm which serverClientId is in effect. Must be the
    // **Web** client ID (ends with .apps.googleusercontent.com), NOT the
    // Android client ID. A wrong value here causes ApiException: 10.
    debugPrint('[GoogleSignIn] serverClientId=${AppConfig.googleServerClientId}');
    final gsi = GoogleSignIn(
      serverClientId: AppConfig.googleServerClientId,
      scopes: const ['email', 'profile'],
    );
    final account = await gsi.signIn();
    if (account == null) return false; // cancelled
    final tokens = await account.authentication;
    final idToken = tokens.idToken;
    if (idToken == null || idToken.isEmpty) {
      throw ApiException(0, 'Tidak mendapatkan token Google.');
    }
    await _apply(await AuthService.google(idToken));
    return true;
  }

  Future<void> _apply(AuthResult r) async {
    _token = r.token;
    _user = r.user;
    api.setToken(r.token);
    await _storage.write(key: _kToken, value: r.token);
    await _storage.write(key: _kExp, value: r.expiresAt);
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    _user = null;
    api.setToken(null);
    await _storage.delete(key: _kToken);
    await _storage.delete(key: _kExp);
    notifyListeners();
  }
}
