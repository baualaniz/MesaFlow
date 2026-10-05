import 'package:flutter/material.dart';
import 'package:flutter_web_plugins/url_strategy.dart';

import 'src/app.dart';
import 'src/assistance/firebase_assistance_gateway.dart';
import 'src/assistance/firestore_assistance_repository.dart';
import 'src/cart/shared_preferences_cart_store.dart';
import 'src/config/app_environment.dart';
import 'src/consumption/firebase_consumption_gateway.dart';
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
  final firebase = await initializeMesaFlowFirebase(environment);
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
    ),
  );
}
