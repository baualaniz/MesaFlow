import 'package:flutter/material.dart';

import 'src/academic/academic_firebase_backend.dart';
import 'src/app.dart';
import 'src/assistance/firebase_assistance_gateway.dart';
import 'src/assistance/firestore_assistance_repository.dart';
import 'src/cart/shared_preferences_cart_store.dart';
import 'src/config/app_environment.dart';
import 'src/consumption/firebase_consumption_gateway.dart';
import 'src/demo/demo_customer_backend.dart';
import 'src/demo/demo_worker_payment_gateway.dart';
import 'src/firebase/firebase_bootstrap.dart';
import 'src/menu/firestore_menu_repository.dart';
import 'src/order/firebase_order_gateway.dart';
import 'src/order/firestore_order_tracking_repository.dart';
import 'src/payment/firebase_payment_gateway.dart';
import 'src/platform/url_strategy.dart';
import 'src/session/firebase_qr_session_gateway.dart';

export 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  configureMesaFlowUrlStrategy();
  final environment = AppEnvironment.fromCompileTime();
  if (environment == AppEnvironment.demo) {
    final backend = DemoCustomerBackend();
    runApp(
      MesaFlowApp(
        environment: environment,
        qrSessionGateway: backend,
        menuRepository: backend,
        cartStore: SharedPreferencesCartStore(),
        orderGateway: backend.orderGateway,
        orderTrackingRepository: backend,
        assistanceGateway: backend.assistanceGateway,
        assistanceRepository: backend,
        consumptionGateway: backend,
        paymentGateway: createDemoPaymentGateway(backend: backend),
      ),
    );
    return;
  }
  final firebase = await initializeMesaFlowFirebase(environment);
  if (environment == AppEnvironment.academic ||
      environment == AppEnvironment.academicProduction) {
    final backend = AcademicFirebaseBackend(
      auth: firebase.auth,
      firestore: firebase.firestore,
    );
    runApp(
      MesaFlowApp(
        environment: environment,
        qrSessionGateway: backend,
        menuRepository: FirestoreMenuRepository(firestore: firebase.firestore),
        cartStore: SharedPreferencesCartStore(),
        orderGateway: backend.orderGateway,
        orderTrackingRepository: FirestoreOrderTrackingRepository(
          firestore: firebase.firestore,
        ),
        assistanceGateway: backend.assistanceGateway,
        assistanceRepository: FirestoreAssistanceRepository(
          firestore: firebase.firestore,
        ),
        consumptionGateway: backend,
        paymentGateway: backend.paymentGateway,
      ),
    );
    return;
  }
  runApp(
    MesaFlowApp(
      environment: environment,
      qrSessionGateway: FirebaseQrSessionGateway(
        auth: firebase.auth,
        functions: firebase.functions,
      ),
      menuRepository: FirestoreMenuRepository(firestore: firebase.firestore),
      cartStore: SharedPreferencesCartStore(),
      orderGateway: FirebaseOrderGateway(functions: firebase.functions),
      orderTrackingRepository: FirestoreOrderTrackingRepository(
        firestore: firebase.firestore,
      ),
      assistanceGateway: FirebaseAssistanceGateway(
        functions: firebase.functions,
      ),
      assistanceRepository: FirestoreAssistanceRepository(
        firestore: firebase.firestore,
      ),
      consumptionGateway: FirebaseConsumptionGateway(
        functions: firebase.functions,
      ),
      paymentGateway: FirebasePaymentGateway(functions: firebase.functions),
    ),
  );
}
