import 'package:flutter/material.dart';

import 'src/app.dart';
import 'src/config/app_environment.dart';
import 'src/firebase/firebase_bootstrap.dart';

export 'src/app.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final environment = AppEnvironment.fromCompileTime();
  await initializeMesaFlowFirebase(environment);
  runApp(MesaFlowApp(environment: environment));
}
