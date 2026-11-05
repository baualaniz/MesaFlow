import 'dart:convert';

import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:crypto/crypto.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

import '../assistance/assistance_gateway.dart';
import '../consumption/consumption_gateway.dart';
import '../contracts/domain_contracts.dart';
import '../models/product_selection.dart';
import '../order/order_gateway.dart';
import '../payment/payment_gateway.dart';
import '../routing/customer_routes.dart';
import '../session/qr_session.dart';

/// Adaptador académico conectado al proyecto Firebase de desarrollo.
///
/// Usa Authentication y Firestore directamente para no depender de Cloud
/// Functions (que exige facturación), pero solo puede escribir cuando las
/// reglas encuentran `academicDeployments/{establishmentId}` habilitado.
final class AcademicFirebaseBackend
    implements QrSessionGateway, ConsumptionGateway {
  AcademicFirebaseBackend({
    required FirebaseAuth auth,
    required FirebaseFirestore firestore,
    http.Client? httpClient,
  }) : _auth = auth,
       _firestore = firestore,
       _http = httpClient ?? http.Client();

  final FirebaseAuth _auth;
  final FirebaseFirestore _firestore;
  final http.Client _http;
  Future<User>? _authentication;

  OrderGateway get orderGateway => _AcademicOrderGateway(this);
  AssistanceGateway get assistanceGateway => _AcademicAssistanceGateway(this);
  PaymentGateway get paymentGateway => _AcademicPaymentGateway(this);

  Future<User> _user() async {
    final pending = _authentication;
    if (pending != null) return pending;
    final attempt = _authenticate();
    _authentication = attempt;
    try {
      return await attempt;
    } catch (_) {
      if (identical(_authentication, attempt)) _authentication = null;
      rethrow;
    }
  }

  Future<User> _authenticate() async {
    if (kIsWeb) await _auth.setPersistence(Persistence.LOCAL);
    final existing = _auth.currentUser;
    if (existing != null) {
      if (!existing.isAnonymous) {
        throw const QrSessionException(QrSessionFailure.accessRequired);
      }
      return existing;
    }
    try {
      final credential = await _auth.signInAnonymously();
      return credential.user ??
          (throw const QrSessionException(QrSessionFailure.unavailable));
    } on FirebaseAuthException {
      throw const QrSessionException(QrSessionFailure.unavailable);
    }
  }

  String _accessPreferenceKey(CustomerTableRoute route) =>
      'academic-qr:${route.establishmentSlug}:${route.tableId}';

  String _tokenHash(String token) => sha256.convert(utf8.encode(token)).toString();

  @override
  Future<QrSessionAccess> exchange({
    required CustomerTableRoute route,
    required String token,
  }) async {
    if (token.length < 32 || token.length > 256) {
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
    final user = await _user();
    final cachedPreferences = await SharedPreferences.getInstance();
    if (cachedPreferences.containsKey(_accessPreferenceKey(route))) {
      try {
        return await restore(route);
      } on QrSessionException {
        // Si el QR anterior fue revocado, continúa con el token recién leído.
      }
    }
    final slugSnapshot = await _firestore
        .collection('establishmentSlugs')
        .doc(route.establishmentSlug)
        .get();
    final slug = slugSnapshot.data();
    if (!slugSnapshot.exists || slug == null || slug['active'] != true) {
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
    final establishmentId = slug['establishmentId'];
    if (establishmentId is! String || establishmentId.isEmpty) {
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
    final hash = _tokenHash(token);
    try {
      final result = await _exchangeTransaction(
        establishmentId: establishmentId,
        route: route,
        hash: hash,
        uid: user.uid,
      );
      final preferences = await SharedPreferences.getInstance();
      await preferences.setString(
        _accessPreferenceKey(route),
        jsonEncode({...result.storage, 'qrHash': hash}),
      );
      return result.access;
    } on QrSessionException {
      rethrow;
    } on FirebaseException catch (error) {
      if (error.code == 'permission-denied' || error.code == 'not-found') {
        throw const QrSessionException(QrSessionFailure.invalidQr);
      }
      throw const QrSessionException(QrSessionFailure.unavailable);
    }
  }

  Future<_AcademicAccessResult> _exchangeTransaction({
    required String establishmentId,
    required CustomerTableRoute route,
    required String hash,
    required String uid,
  }) => _firestore.runTransaction((transaction) async {
    final root = _firestore.collection('establishments').doc(establishmentId);
    final qrReference = root.collection('qrAccess').doc(hash);
    final qrSnapshot = await transaction.get(qrReference);
    final qr = qrSnapshot.data();
    if (!qrSnapshot.exists || qr == null || qr['active'] != true ||
        qr['tableId'] != route.tableId ||
        qr['establishmentSlug'] != route.establishmentSlug) {
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
    final sessionId = qr['sessionId'];
    final tableName = qr['tableName'];
    final qrVersion = qr['qrVersion'];
    if (sessionId is! String || sessionId.isEmpty ||
        tableName is! String || tableName.isEmpty ||
        qrVersion is! int || qrVersion < 1) {
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
    final establishmentReference = _firestore
        .collection('establishments')
        .doc(establishmentId);
    final participantReference = root
        .collection('tableSessions')
        .doc(sessionId)
        .collection('participants')
        .doc(uid);
    final establishment = (await transaction.get(establishmentReference)).data();
    if (establishment == null || establishment['active'] != true) {
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
    transaction.set(participantReference, {
      'active': true,
      'establishmentId': establishmentId,
      'joinedAt': FieldValue.serverTimestamp(),
      'qrHash': hash,
      'qrVersion': qrVersion,
      'revokedAt': null,
      'sessionId': sessionId,
      'tableId': route.tableId,
      'uid': uid,
    });
    final establishmentName = establishment['name'];
    if (establishmentName is! String || establishmentName.isEmpty) {
      throw const QrSessionException(QrSessionFailure.unavailable);
    }
    final storage = <String, Object>{
      'establishmentId': establishmentId,
      'establishmentName': establishmentName,
      'tableId': route.tableId,
      'tableName': tableName,
      'sessionId': sessionId,
      'qrVersion': qrVersion,
    };
    return _AcademicAccessResult(
      access: _accessFromStorage(storage),
      storage: storage,
    );
  });

  @override
  Future<QrSessionAccess> restore(CustomerTableRoute route) async {
    final user = await _user();
    final preferences = await SharedPreferences.getInstance();
    final key = _accessPreferenceKey(route);
    final encoded = preferences.getString(key);
    if (encoded == null) {
      throw const QrSessionException(QrSessionFailure.accessRequired);
    }
    try {
      final stored = Map<String, Object?>.from(jsonDecode(encoded) as Map);
      final establishmentId = stored['establishmentId'];
      final sessionId = stored['sessionId'];
      final hash = stored['qrHash'];
      if (establishmentId is! String || sessionId is! String || hash is! String ||
          stored['tableId'] != route.tableId) {
        throw const FormatException();
      }
      final root = _firestore.collection('establishments').doc(establishmentId);
      final snapshots = await Future.wait([
        root.collection('qrAccess').doc(hash).get(),
        root.collection('tableSessions').doc(sessionId).get(),
        root.collection('tableSessions').doc(sessionId)
            .collection('participants').doc(user.uid).get(),
      ]);
      final qr = snapshots[0].data();
      final session = snapshots[1].data();
      final participant = snapshots[2].data();
      if (qr == null || qr['active'] != true ||
          qr['tableId'] != route.tableId || qr['sessionId'] != sessionId ||
          session == null || session['status'] != 'open' ||
          participant == null || participant['active'] != true ||
          participant['qrHash'] != hash) {
        throw const QrSessionException(QrSessionFailure.invalidQr);
      }
      return _accessFromStorage(stored);
    } on QrSessionException {
      await preferences.remove(key);
      rethrow;
    } on Object {
      await preferences.remove(key);
      throw const QrSessionException(QrSessionFailure.invalidQr);
    }
  }

  QrSessionAccess _accessFromStorage(Map<String, Object?> data) {
    String field(String name) {
      final value = data[name];
      if (value is! String || value.isEmpty) throw const FormatException();
      return value;
    }
    return QrSessionAccess(
      establishmentId: field('establishmentId'),
      establishmentName: field('establishmentName'),
      tableId: field('tableId'),
      tableName: field('tableName'),
      sessionId: field('sessionId'),
    );
  }

  Future<CreatedOrder> createOrder({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  }) async {
    final user = await _user();
    if (lines.isEmpty || lines.length > 30) {
      throw const OrderException(OrderFailure.invalidCart);
    }
    final orderId = sha256
        .convert(utf8.encode('${session.sessionId}:${user.uid}:$requestId'))
        .toString();
    final root = _firestore
        .collection('establishments')
        .doc(session.establishmentId);
    final orderReference = root.collection('orders').doc(orderId);
    final sessionReference = root
        .collection('tableSessions')
        .doc(session.sessionId);
    final now = DateTime.now().toUtc();
    final items = lines.map((line) => {
      'productId': line.product.id,
      'name': line.product.name,
      'unitPriceMinor': line.product.price.amountMinor,
      'quantity': line.quantity,
      'lineTotalMinor': line.lineTotal.amountMinor,
      'notes': line.notes,
    }).toList(growable: false);
    final total = items.fold<int>(
      0,
      (totalSoFar, item) =>
          totalSoFar + (item['lineTotalMinor']! as int),
    );
    try {
      await _firestore.runTransaction((transaction) async {
        final currentSession = await transaction.get(sessionReference);
        final data = currentSession.data();
        if (data == null || data['status'] != 'open') {
          throw const OrderException(OrderFailure.sessionUnavailable);
        }
        final subtotal = data['subtotalMinor'];
        final balance = data['balanceMinor'];
        if (subtotal is! int || balance is! int) {
          throw const OrderException(OrderFailure.unavailable);
        }
        final timestamp = Timestamp.fromDate(now);
        transaction.set(orderReference, {
          'establishmentId': session.establishmentId,
          'sessionId': session.sessionId,
          'tableId': session.tableId,
          'customerUid': user.uid,
          'status': 'created',
          'items': items,
          'subtotalMinor': total,
          'totalMinor': total,
          'currency': lines.first.product.price.currency,
          'notes': null,
          'statusTimestamps': {'created': timestamp},
          'createdAt': timestamp,
          'updatedAt': timestamp,
        });
        transaction.update(sessionReference, {
          'subtotalMinor': subtotal + total,
          'balanceMinor': balance + total,
          'updatedAt': timestamp,
        });
      });
      return CreatedOrder(
        id: orderId,
        itemCount: lines.fold(
          0,
          (itemTotal, line) => itemTotal + line.quantity,
        ),
        totalMinor: total,
        currency: lines.first.product.price.currency,
        createdAt: now,
      );
    } on OrderException {
      rethrow;
    } on FirebaseException catch (error) {
      throw OrderException(error.code == 'permission-denied'
          ? OrderFailure.sessionUnavailable
          : OrderFailure.unavailable);
    }
  }

  Future<AssistanceActionResult> createAssistance({
    required QrSessionAccess session,
    required AssistanceType type,
  }) async {
    final user = await _user();
    final reference = _firestore
        .collection('establishments')
        .doc(session.establishmentId)
        .collection('assistanceRequests')
        .doc(session.sessionId);
    final now = DateTime.now().toUtc();
    final timestamp = Timestamp.fromDate(now);
    try {
      await _firestore.runTransaction((transaction) async {
        final existing = await transaction.get(reference);
        final data = existing.data();
        if (data != null && ['pending', 'acknowledged'].contains(data['status'])) {
          throw const AssistanceException(AssistanceFailure.requestInProgress);
        }
        transaction.set(reference, {
          'establishmentId': session.establishmentId,
          'sessionId': session.sessionId,
          'tableId': session.tableId,
          'customerUid': user.uid,
          'type': assistanceTypeWireValues[type.index],
          'status': 'pending',
          'acknowledgedBy': null,
          'resolvedBy': null,
          'createdAt': timestamp,
          'updatedAt': timestamp,
        });
      });
      return AssistanceActionResult(
        requestId: session.sessionId,
        type: type,
        status: AssistanceStatus.pending,
        createdAt: now,
        updatedAt: now,
      );
    } on AssistanceException {
      rethrow;
    } on FirebaseException catch (error) {
      throw AssistanceException(error.code == 'permission-denied'
          ? AssistanceFailure.sessionUnavailable
          : AssistanceFailure.unavailable);
    }
  }

  Future<AssistanceActionResult> cancelAssistance({
    required QrSessionAccess session,
  }) async {
    final user = await _user();
    final reference = _firestore
        .collection('establishments')
        .doc(session.establishmentId)
        .collection('assistanceRequests')
        .doc(session.sessionId);
    final now = DateTime.now().toUtc();
    try {
      late AssistanceType type;
      late DateTime createdAt;
      await _firestore.runTransaction((transaction) async {
        final snapshot = await transaction.get(reference);
        final data = snapshot.data();
        if (data == null || data['customerUid'] != user.uid ||
            !['pending', 'acknowledged'].contains(data['status'])) {
          throw const AssistanceException(AssistanceFailure.requestUnavailable);
        }
        final typeIndex = assistanceTypeWireValues.indexOf(data['type']);
        final created = data['createdAt'];
        if (typeIndex < 0 || created is! Timestamp) {
          throw const AssistanceException(AssistanceFailure.unavailable);
        }
        type = AssistanceType.values[typeIndex];
        createdAt = created.toDate().toUtc();
        transaction.update(reference, {
          'status': 'cancelled',
          'updatedAt': Timestamp.fromDate(now),
        });
      });
      return AssistanceActionResult(
        requestId: session.sessionId,
        type: type,
        status: AssistanceStatus.cancelled,
        createdAt: createdAt,
        updatedAt: now,
      );
    } on AssistanceException {
      rethrow;
    } on FirebaseException {
      throw const AssistanceException(AssistanceFailure.unavailable);
    }
  }

  @override
  Future<ConsumptionSummary> get({required QrSessionAccess session}) async {
    try {
      final snapshot = await _firestore
          .collection('establishments')
          .doc(session.establishmentId)
          .collection('tableSessions')
          .doc(session.sessionId)
          .get();
      final data = snapshot.data();
      if (data == null) {
        throw const ConsumptionException(ConsumptionFailure.sessionUnavailable);
      }
      final orders = await _firestore
          .collection('establishments')
          .doc(session.establishmentId)
          .collection('orders')
          .where('sessionId', isEqualTo: session.sessionId)
          .get();
      final statusIndex = tableSessionStatusWireValues.indexOf(data['status']);
      if (statusIndex < 0) throw const FormatException();
      final subtotal = data['subtotalMinor'];
      final paid = data['paidMinor'];
      final balance = data['balanceMinor'];
      if (subtotal is! int || paid is! int || balance is! int) {
        throw const FormatException();
      }
      var itemCount = 0;
      for (final order in orders.docs) {
        final items = order.data()['items'];
        if (items is List) {
          for (final item in items) {
            if (item is Map && item['quantity'] is int) {
              itemCount += item['quantity'] as int;
            }
          }
        }
      }
      return ConsumptionSummary(
        sessionId: session.sessionId,
        tableId: session.tableId,
        sessionStatus: TableSessionStatus.values[statusIndex],
        currency: 'ARS',
        orderCount: orders.docs.length,
        itemCount: itemCount,
        subtotalMinor: subtotal,
        paidMinor: paid,
        balanceMinor: balance,
        calculatedAt: DateTime.now().toUtc(),
      );
    } on ConsumptionException {
      rethrow;
    } on Object {
      throw const ConsumptionException(ConsumptionFailure.unavailable);
    }
  }

  Future<PaymentPreference> createPayment({required QrSessionAccess session}) async {
    const rawEndpoint = String.fromEnvironment('MESAFLOW_DEMO_PAYMENT_API_URL');
    final endpoint = Uri.tryParse(rawEndpoint);
    if (endpoint == null || endpoint.scheme != 'https' ||
        !endpoint.host.endsWith('.workers.dev') ||
        endpoint.path != '/preferences') {
      throw const PaymentException(PaymentFailure.providerUnavailable);
    }
    final snapshot = await _firestore
        .collection('establishments')
        .doc(session.establishmentId)
        .collection('orders')
        .where('sessionId', isEqualTo: session.sessionId)
        .get();
    final quantities = <String, int>{};
    for (final order in snapshot.docs) {
      if (order.data()['status'] == 'cancelled') continue;
      final items = order.data()['items'];
      if (items is! List) continue;
      for (final item in items) {
        if (item is! Map ||
            item['productId'] is! String ||
            item['quantity'] is! int) {
          continue;
        }
        quantities.update(
          item['productId'] as String,
          (quantity) => quantity + (item['quantity'] as int),
          ifAbsent: () => item['quantity'] as int,
        );
      }
    }
    if (quantities.isEmpty) {
      throw const PaymentException(PaymentFailure.balanceUnavailable);
    }
    try {
      final response = await _http.post(
        endpoint,
        headers: const {
          'Content-Type': 'application/json',
          'X-MesaFlow-Client': 'demo-v1',
        },
        body: jsonEncode({
          'sessionId': session.sessionId,
          'tableId': session.tableId,
          'items': quantities.entries.map((entry) => {
            'productId': entry.key,
            'quantity': entry.value,
          }).toList(growable: false),
        }),
      ).timeout(const Duration(seconds: 15));
      if (response.statusCode != 200) {
        throw const PaymentException(PaymentFailure.providerUnavailable);
      }
      return PaymentPreference.fromCallableData(
        jsonDecode(utf8.decode(response.bodyBytes)),
      );
    } on PaymentException {
      rethrow;
    } on Object {
      throw const PaymentException(PaymentFailure.unavailable);
    }
  }
}

final class _AcademicAccessResult {
  const _AcademicAccessResult({required this.access, required this.storage});

  final QrSessionAccess access;
  final Map<String, Object> storage;
}

final class _AcademicOrderGateway implements OrderGateway {
  const _AcademicOrderGateway(this.backend);
  final AcademicFirebaseBackend backend;

  @override
  Future<CreatedOrder> create({
    required QrSessionAccess session,
    required String requestId,
    required List<ProductSelection> lines,
  }) => backend.createOrder(session: session, requestId: requestId, lines: lines);
}

final class _AcademicAssistanceGateway implements AssistanceGateway {
  const _AcademicAssistanceGateway(this.backend);
  final AcademicFirebaseBackend backend;

  @override
  Future<AssistanceActionResult> create({
    required QrSessionAccess session,
    required AssistanceType type,
  }) => backend.createAssistance(session: session, type: type);

  @override
  Future<AssistanceActionResult> cancel({required QrSessionAccess session}) =>
      backend.cancelAssistance(session: session);
}

final class _AcademicPaymentGateway implements PaymentGateway {
  const _AcademicPaymentGateway(this.backend);
  final AcademicFirebaseBackend backend;

  @override
  Future<PaymentPreference> create({required QrSessionAccess session}) =>
      backend.createPayment(session: session);
}
