import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../config/app_environment.dart';
import 'firebase_options_dev.dart' as development;
import 'firebase_options_prod.dart' as production;

final class MesaFlowFirebaseServices {
  const MesaFlowFirebaseServices({
    required this.app,
    required this.auth,
    required this.firestore,
    required this.functions,
  });

  final FirebaseApp app;
  final FirebaseAuth auth;
  final FirebaseFirestore firestore;
  final FirebaseFunctions functions;
}

FirebaseOptions cloudFirebaseOptionsFor(AppEnvironment environment) {
  final options = switch (environment) {
    AppEnvironment.development => development.DefaultFirebaseOptions.web,
    AppEnvironment.production => production.DefaultFirebaseOptions.web,
    AppEnvironment.emulator => throw StateError(
      'El emulador usa demoProjectId y no opciones de un proyecto cloud.',
    ),
  };
  if (options.projectId != environment.projectId) {
    throw StateError(
      'Configuración Firebase cruzada: ${options.projectId} no corresponde a '
      '${environment.projectId}.',
    );
  }
  return options;
}

Future<MesaFlowFirebaseServices> initializeMesaFlowFirebase(
  AppEnvironment environment,
) async {
  late final FirebaseApp app;
  if (environment == AppEnvironment.emulator) {
    app = await Firebase.initializeApp(demoProjectId: environment.projectId);
  } else {
    app = await Firebase.initializeApp(
      options: cloudFirebaseOptionsFor(environment),
    );
  }
  final auth = FirebaseAuth.instanceFor(app: app);
  final firestore = FirebaseFirestore.instanceFor(app: app);
  final functions = FirebaseFunctions.instanceFor(
    app: app,
    region: 'southamerica-east1',
  );
  if (environment == AppEnvironment.emulator) {
    await auth.useAuthEmulator('127.0.0.1', 9099);
    firestore.useFirestoreEmulator('127.0.0.1', 8080);
    functions.useFunctionsEmulator('127.0.0.1', 5001);
  }
  return MesaFlowFirebaseServices(
    app: app,
    auth: auth,
    firestore: firestore,
    functions: functions,
  );
}
