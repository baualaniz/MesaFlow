import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';

import '../config/app_environment.dart';
import 'firebase_options_dev.dart' as development;
import 'firebase_options_prod.dart' as production;

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

Future<FirebaseApp> initializeMesaFlowFirebase(
  AppEnvironment environment,
) async {
  if (environment == AppEnvironment.emulator) {
    final app = await Firebase.initializeApp(
      demoProjectId: environment.projectId,
    );
    await FirebaseAuth.instanceFor(app: app).useAuthEmulator('127.0.0.1', 9099);
    FirebaseFunctions.instanceFor(
      app: app,
      region: 'southamerica-east1',
    ).useFunctionsEmulator('127.0.0.1', 5001);
    return app;
  }
  return Firebase.initializeApp(options: cloudFirebaseOptionsFor(environment));
}
