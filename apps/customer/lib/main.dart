import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

import 'src/app.dart';
import 'src/cart/shared_preferences_cart_store.dart';
import 'src/config/app_environment.dart';
import 'src/firebase/firebase_bootstrap.dart';
import 'src/menu/firestore_menu_repository.dart';
import 'src/order/firebase_order_gateway.dart';
import 'src/order/firestore_order_tracking_repository.dart';
import 'src/session/firebase_qr_session_gateway.dart';

export 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  usePathUrlStrategy();
  final environment = AppEnvironment.fromCompileTime();
  await initializeMesaFlowFirebase(environment);
  runApp(
    MesaFlowApp(
      environment: environment,
      qrSessionGateway: FirebaseQrSessionGateway(),
      menuRepository: FirestoreMenuRepository(),
      cartStore: SharedPreferencesCartStore(),
      orderGateway: FirebaseOrderGateway(),
      orderTrackingRepository: FirestoreOrderTrackingRepository(),
    ),
  );
}
