import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';

import '../routing/customer_routes.dart';
import 'qr_session.dart';

final class FirebaseQrSessionGateway implements QrSessionGateway {
  FirebaseQrSessionGateway({FirebaseAuth? auth, FirebaseFunctions? functions})
    : _auth = auth ?? FirebaseAuth.instance,
      _functions =
          functions ??
          FirebaseFunctions.instanceFor(region: 'southamerica-east1');

  final FirebaseAuth _auth;
  final FirebaseFunctions _functions;
  Future<User>? _authentication;

  Future<User> _authenticatedUser() async {
    final existing = _authentication;
    if (existing != null) return existing;
    final attempt = _createOrRestoreAnonymousUser();
    _authentication = attempt;
    try {
      return await attempt;
    } catch (_) {
      if (identical(_authentication, attempt)) _authentication = null;
      rethrow;
    }
  }

  Future<User> _createOrRestoreAnonymousUser() async {
    if (kIsWeb) await _auth.setPersistence(Persistence.SESSION);
    final current = _auth.currentUser;
    if (current != null) {
      if (!current.isAnonymous) {
        throw const QrSessionException(QrSessionFailure.accessRequired);
      }
      return current;
    }
    try {
      final credential = await _auth.signInAnonymously();
      final user = credential.user;
      if (user == null) {
        throw const QrSessionException(QrSessionFailure.unavailable);
      }
      return user;
    } on FirebaseAuthException catch (error) {
      debugPrint(
        'MesaFlow anonymous authentication failed '
        '[${error.code}]: ${error.message}',
      );
      throw const QrSessionException(QrSessionFailure.unavailable);
    }
  }

  @override
  Future<QrSessionAccess> exchange({
    required CustomerTableRoute route,
    required String token,
  }) async {
    await _authenticatedUser();
    return _call('exchangeQrSession', {
      'establishmentSlug': route.establishmentSlug,
      'tableId': route.tableId,
      'token': token,
    });
  }

  @override
  Future<QrSessionAccess> restore(CustomerTableRoute route) async {
    await _authenticatedUser();
    return _call('restoreQrSession', {
      'establishmentSlug': route.establishmentSlug,
      'tableId': route.tableId,
    });
  }

  Future<QrSessionAccess> _call(String name, Map<String, String> data) async {
    try {
      final result = await _functions.httpsCallable(name).call(data);
      return QrSessionAccess.fromCallableData(result.data);
    } on FirebaseFunctionsException catch (error) {
      debugPrint(
        'MesaFlow callable $name failed [${error.code}]: ${error.message}',
      );
      throw QrSessionException(switch (error.code) {
        'already-exists' => QrSessionFailure.alreadyUsed,
        'invalid-argument' || 'permission-denied' => QrSessionFailure.invalidQr,
        'unauthenticated' => QrSessionFailure.accessRequired,
        _ => QrSessionFailure.unavailable,
      });
    }
  }
}
