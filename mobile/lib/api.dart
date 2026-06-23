import 'dart:convert';
import 'package:http/http.dart' as http;
import 'config.dart';

/// Error carrying the server's `{ "error": "..." }` message and HTTP status.
class ApiException implements Exception {
  final int statusCode;
  final String message;
  ApiException(this.statusCode, this.message);
  @override
  String toString() => message;
}

/// Thin HTTP client for the Béas gateway. Injects the bearer token, unwraps the
/// `{ "data": ... }` success envelope, and throws [ApiException] on errors.
class ApiClient {
  ApiClient({this.baseUrl = AppConfig.apiBaseUrl});

  final String baseUrl;
  String? _token;

  void setToken(String? token) => _token = token;

  Map<String, String> _headers({bool json = false}) {
    final h = <String, String>{};
    if (json) h['Content-Type'] = 'application/json';
    if (_token != null && _token!.isNotEmpty) {
      h['Authorization'] = 'Bearer $_token';
    }
    return h;
  }

  Future<dynamic> get(String path, {Map<String, String>? query}) async {
    final uri = Uri.parse('$baseUrl$path').replace(
      queryParameters: (query == null || query.isEmpty) ? null : query,
    );
    try {
      final res = await http
          .get(uri, headers: _headers())
          .timeout(const Duration(seconds: 20));
      return _decode(res);
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(0, 'Tidak dapat terhubung ke server.');
    }
  }

  Future<dynamic> post(String path, {Object? body}) async {
    final uri = Uri.parse('$baseUrl$path');
    try {
      final res = await http
          .post(
            uri,
            headers: _headers(json: true),
            body: body == null ? null : jsonEncode(body),
          )
          .timeout(const Duration(seconds: 20));
      return _decode(res);
    } on ApiException {
      rethrow;
    } catch (_) {
      throw ApiException(0, 'Tidak dapat terhubung ke server.');
    }
  }

  dynamic _decode(http.Response res) {
    dynamic parsed;
    if (res.body.isNotEmpty) {
      try {
        parsed = jsonDecode(res.body);
      } catch (_) {
        parsed = null;
      }
    }
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (parsed is Map<String, dynamic> && parsed.containsKey('data')) {
        return parsed['data'];
      }
      return parsed;
    }
    final msg = (parsed is Map && parsed['error'] != null)
        ? parsed['error'].toString()
        : 'Terjadi kesalahan (${res.statusCode}).';
    throw ApiException(res.statusCode, msg);
  }
}

/// Shared singleton used by all services. AuthProvider keeps its token in sync.
final api = ApiClient();
