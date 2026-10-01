import 'package:flutter/material.dart';

import '../theme/mesaflow_theme.dart';

enum MesaFlowFeedbackTone { neutral, info, success, warning, error }

class MesaFlowFeedbackPanel extends StatelessWidget {
  const MesaFlowFeedbackPanel({
    super.key,
    required this.title,
    required this.message,
    this.tone = MesaFlowFeedbackTone.neutral,
    this.action,
  });

  final String title;
  final String message;
  final MesaFlowFeedbackTone tone;
  final Widget? action;

  (Color, Color, IconData) get _appearance => switch (tone) {
        MesaFlowFeedbackTone.neutral => (
            MesaFlowColors.white,
            MesaFlowColors.charcoal,
            Icons.info_outline_rounded,
          ),
        MesaFlowFeedbackTone.info => (
            MesaFlowColors.infoSurface,
            MesaFlowColors.info,
            Icons.info_outline_rounded,
          ),
        MesaFlowFeedbackTone.success => (
            MesaFlowColors.successSurface,
            MesaFlowColors.success,
            Icons.check_circle_outline_rounded,
          ),
        MesaFlowFeedbackTone.warning => (
            MesaFlowColors.warningSurface,
            MesaFlowColors.warning,
            Icons.warning_amber_rounded,
          ),
        MesaFlowFeedbackTone.error => (
            MesaFlowColors.errorSurface,
            MesaFlowColors.error,
            Icons.error_outline_rounded,
          ),
      };

  @override
  Widget build(BuildContext context) {
    final (background, foreground, icon) = _appearance;
    return Semantics(
      container: true,
      liveRegion: tone == MesaFlowFeedbackTone.error,
      child: Container(
        width: double.infinity,
        constraints: const BoxConstraints(maxWidth: 640),
        padding: const EdgeInsets.all(MesaFlowSpacing.lg),
        decoration: BoxDecoration(
          color: background,
          borderRadius: BorderRadius.circular(MesaFlowRadius.lg),
          border: Border.all(color: foreground.withValues(alpha: 0.22)),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, color: foreground, size: 26),
            const SizedBox(width: MesaFlowSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: foreground,
                        ),
                  ),
                  const SizedBox(height: MesaFlowSpacing.xxs),
                  Text(message, style: Theme.of(context).textTheme.bodyMedium),
                  if (action != null) ...[
                    const SizedBox(height: MesaFlowSpacing.sm),
                    action!,
                  ],
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
