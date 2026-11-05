import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:cloud_functions/cloud_functions.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/foundation.dart';

import '../config/app_environment.dart';
import 'app_check_config.dart';
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
    AppEnvironment.academic || AppEnvironment.development =>
      _developmentOptions(),
    AppEnvironment.academicProduction || AppEnvironment.production =>
      _productionOptions(),
    AppEnvironment.demo || AppEnvironment.emulator => throw StateError(
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

FirebaseOptions _developmentOptions() {
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return development.DefaultFirebaseOptions.android;
  }
  // Los tests de Flutter se ejecutan como Linux; la configuración web permite
  // validar el contrato sin habilitar una tercera aplicación Firebase.
  return development.DefaultFirebaseOptions.web;
}

FirebaseOptions _productionOptions() {
  if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
    return production.DefaultFirebaseOptions.android;
  }
  return production.DefaultFirebaseOptions.web;
}

Future<MesaFlowFirebaseServices> initializeMesaFlowFirebase(
  AppEnvironment environment,
) async {
  late final FirebaseApp app;
  if (environment == AppEnvironment.demo) {
    throw StateError('La demo académica no inicializa Firebase.');
  }
  if (environment == AppEnvironment.emulator) {
    app = await Firebase.initializeApp(demoProjectId: environment.projectId);
  } else {
    app = await Firebase.initializeApp(
      options: cloudFirebaseOptionsFor(environment),
    );
  }
  final appCheckSiteKey = appCheckSiteKeyFor(environment);
  if (appCheckSiteKey != null && kIsWeb) {
    final appCheck = FirebaseAppCheck.instanceFor(app: app);
    await appCheck.activate(
      providerWeb: ReCaptchaEnterpriseProvider(appCheckSiteKey),
    );
    await appCheck.setTokenAutoRefreshEnabled(true);
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
