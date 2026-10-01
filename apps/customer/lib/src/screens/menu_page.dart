import 'package:flutter/material.dart';

import '../contracts/domain_contracts.dart';
import '../menu/menu_repository.dart';
import '../models/menu_product.dart';
import '../routing/customer_routes.dart';
import '../session/qr_session.dart';
import '../theme/mesaflow_theme.dart';
import '../widgets/product_card.dart';
import '../widgets/feedback_panel.dart';

class MenuPage extends StatefulWidget {
  const MenuPage({
    super.key,
    required this.tableRoute,
    required this.sessionAccess,
    required this.menuRepository,
  });

  final CustomerTableRoute tableRoute;
  final QrSessionAccess sessionAccess;
  final MenuRepository menuRepository;

  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  final _searchController = TextEditingController();
  final Map<String, int> _cart = {};
  MenuCatalog? _catalog;
  Object? _loadError;
  bool _loading = true;
  String? _categoryId;
  String _query = '';

  @override
  void initState() {
    super.initState();
    _loadMenu();
  }

  @override
  void didUpdateWidget(covariant MenuPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.sessionAccess.establishmentId !=
            widget.sessionAccess.establishmentId ||
        oldWidget.menuRepository != widget.menuRepository) {
      _loadMenu();
    }
  }

  Future<void> _loadMenu() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final catalog = await widget.menuRepository.loadPublishedMenu(
        widget.sessionAccess.establishmentId,
      );
      if (!mounted) return;
      final productIds = catalog.products.map((product) => product.id).toSet();
      setState(() {
        _catalog = catalog;
        _loading = false;
        _categoryId = null;
        _cart.removeWhere((productId, _) => !productIds.contains(productId));
      });
    } catch (error) {
      if (!mounted) return;
      setState(() {
        _catalog = null;
        _loadError = error;
        _loading = false;
      });
    }
  }

  List<MenuProduct> get _visibleProducts {
    final query = _query.trim().toLowerCase();
    return (_catalog?.products ?? const <MenuProduct>[])
        .where((product) {
          final inCategory =
              _categoryId == null || product.categoryId == _categoryId;
          final matches =
              query.isEmpty ||
              product.name.toLowerCase().contains(query) ||
              product.description.toLowerCase().contains(query);
          return inCategory && matches;
        })
        .toList(growable: false);
  }

  int get _itemCount => _cart.values.fold(0, (sum, quantity) => sum + quantity);

  int get _total => _cart.entries.fold(0, (sum, entry) {
    final product = _catalog!.products.firstWhere(
      (item) => item.id == entry.key,
    );
    return sum + product.price.amountMinor * entry.value;
  });

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  void _add(MenuProduct product) {
    setState(
      () => _cart.update(product.id, (value) => value + 1, ifAbsent: () => 1),
    );
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(milliseconds: 900),
          content: Text('${product.name} agregado al pedido'),
        ),
      );
  }

  void _showProduct(MenuProduct product) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: MesaFlowColors.white,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Image.asset(
                    'assets/images/mesa-demo.png',
                    fit: BoxFit.cover,
                    alignment: product.imageAlignment,
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Text(
                product.name,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 10),
              Text(
                product.description,
                style: Theme.of(context).textTheme.bodyLarge,
              ),
              const SizedBox(height: 20),
              FilledButton.icon(
                onPressed: () {
                  Navigator.pop(context);
                  _add(product);
                },
                icon: const Icon(Icons.add_rounded),
                label: Text('Agregar · ${formatPrice(product.price)}'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCart() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Tu pedido',
                style: Theme.of(context).textTheme.headlineMedium,
              ),
              const SizedBox(height: 18),
              for (final entry in _cart.entries)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 7),
                  child: Row(
                    children: [
                      CircleAvatar(
                        backgroundColor: MesaFlowColors.softGreen,
                        child: Text('${entry.value}'),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          _catalog!.products
                              .firstWhere((item) => item.id == entry.key)
                              .name,
                        ),
                      ),
                    ],
                  ),
                ),
              const Divider(height: 28),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Total'),
                  Text(
                    formatPrice(Money(amountMinor: _total, currency: 'ARS')),
                    style: Theme.of(context).textTheme.titleLarge,
                  ),
                ],
              ),
              const SizedBox(height: 18),
              FilledButton(
                onPressed: () {},
                child: const Text('Continuar pedido'),
              ),
              const SizedBox(height: 8),
              Text(
                'Demo visual: la confirmación se conectará a Firebase en las próximas etapas.',
                textAlign: TextAlign.center,
                style: Theme.of(context).textTheme.bodySmall,
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(
              child: _Header(
                itemCount: _itemCount,
                establishmentName: widget.sessionAccess.establishmentName,
                tableLabel: widget.sessionAccess.tableName,
              ),
            ),
            if (!_loading &&
                _loadError == null &&
                _catalog!.categories.isNotEmpty &&
                _catalog!.products.isNotEmpty)
              SliverToBoxAdapter(
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 1240),
                    child: Padding(
                      padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          TextField(
                            controller: _searchController,
                            onChanged: (value) =>
                                setState(() => _query = value),
                            decoration: const InputDecoration(
                              hintText: 'Buscar en el menú',
                              prefixIcon: Icon(Icons.search_rounded),
                            ),
                          ),
                          const SizedBox(height: 18),
                          SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                Padding(
                                  padding: const EdgeInsets.only(right: 10),
                                  child: ChoiceChip(
                                    label: const Text('Todos'),
                                    selected: _categoryId == null,
                                    onSelected: (_) =>
                                        setState(() => _categoryId = null),
                                  ),
                                ),
                                for (final category in _catalog!.categories)
                                  Padding(
                                    padding: const EdgeInsets.only(right: 10),
                                    child: ChoiceChip(
                                      label: Text(category.name),
                                      selected: _categoryId == category.id,
                                      onSelected: (_) => setState(
                                        () => _categoryId = category.id,
                                      ),
                                    ),
                                  ),
                              ],
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'Elegí algo rico',
                            style: Theme.of(context).textTheme.headlineMedium,
                          ),
                          const SizedBox(height: 6),
                          Text(
                            '${_visibleProducts.length} opciones disponibles',
                            style: Theme.of(context).textTheme.bodyMedium,
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
            if (_loading)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: _MenuLoading(),
              )
            else if (_loadError != null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _MenuLoadFailure(onRetry: _loadMenu),
              )
            else if (_catalog!.categories.isEmpty || _catalog!.products.isEmpty)
              const SliverFillRemaining(
                hasScrollBody: false,
                child: _EmptyCatalog(),
              )
            else
              SliverPadding(
                padding: EdgeInsets.fromLTRB(
                  20,
                  12,
                  20,
                  _itemCount > 0 ? 110 : 32,
                ),
                sliver: _visibleProducts.isEmpty
                    ? const SliverToBoxAdapter(child: _EmptySearch())
                    : SliverLayoutBuilder(
                        builder: (context, constraints) {
                          final width = constraints.crossAxisExtent;
                          final columns = width >= 1100
                              ? 3
                              : width >= 700
                              ? 2
                              : 1;
                          return SliverGrid(
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                                  crossAxisCount: columns,
                                  crossAxisSpacing: 18,
                                  mainAxisSpacing: 18,
                                  mainAxisExtent: columns == 1 ? 350 : 370,
                                ),
                            delegate: SliverChildBuilderDelegate((
                              context,
                              index,
                            ) {
                              final product = _visibleProducts[index];
                              return ProductCard(
                                product: product,
                                onAdd: () => _add(product),
                                onOpen: () => _showProduct(product),
                              );
                            }, childCount: _visibleProducts.length),
                          );
                        },
                      ),
              ),
          ],
        ),
      ),
      bottomNavigationBar: _itemCount == 0
          ? null
          : SafeArea(
              minimum: const EdgeInsets.fromLTRB(16, 8, 16, 16),
              child: FilledButton(
                key: const ValueKey('open-cart'),
                onPressed: _showCart,
                style: FilledButton.styleFrom(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 20,
                    vertical: 18,
                  ),
                  backgroundColor: MesaFlowColors.charcoal,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(18),
                  ),
                ),
                child: Row(
                  children: [
                    DecoratedBox(
                      decoration: BoxDecoration(
                        color: MesaFlowColors.sage,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 5,
                        ),
                        child: Text('$_itemCount'),
                      ),
                    ),
                    const SizedBox(width: 12),
                    const Expanded(child: Text('Ver pedido')),
                    Text(
                      formatPrice(Money(amountMinor: _total, currency: 'ARS')),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}

class _MenuLoading extends StatelessWidget {
  const _MenuLoading();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Semantics(
        label: 'Cargando el menú',
        child: const CircularProgressIndicator(),
      ),
    );
  }
}

class _MenuLoadFailure extends StatelessWidget {
  const _MenuLoadFailure({required this.onRetry});

  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(MesaFlowSpacing.lg),
        child: MesaFlowFeedbackPanel(
          title: 'No pudimos cargar el menú',
          message: 'Revisá tu conexión e intentá nuevamente.',
          tone: MesaFlowFeedbackTone.error,
          action: FilledButton.icon(
            key: const ValueKey('retry-menu'),
            onPressed: onRetry,
            icon: const Icon(Icons.refresh_rounded),
            label: const Text('Reintentar'),
          ),
        ),
      ),
    );
  }
}

class _EmptyCatalog extends StatelessWidget {
  const _EmptyCatalog();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Padding(
        padding: EdgeInsets.all(MesaFlowSpacing.lg),
        child: MesaFlowFeedbackPanel(
          title: 'El menú todavía no está publicado',
          message: 'Consultá al personal por las opciones disponibles.',
          tone: MesaFlowFeedbackTone.info,
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.itemCount,
    required this.establishmentName,
    required this.tableLabel,
  });

  final int itemCount;
  final String establishmentName;
  final String tableLabel;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: MesaFlowColors.softGreen,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 1240),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const _BrandMark(),
                    const Spacer(),
                    Semantics(
                      label: '$itemCount productos en el pedido',
                      child: Badge(
                        isLabelVisible: itemCount > 0,
                        label: Text('$itemCount'),
                        child: IconButton(
                          onPressed: () {},
                          tooltip: 'Pedido',
                          icon: const Icon(Icons.shopping_bag_outlined),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                Text(
                  'Bienvenidos a\n$establishmentName',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: [
                    _InfoPill(
                      icon: Icons.table_restaurant_outlined,
                      label: tableLabel,
                    ),
                    const _InfoPill(
                      icon: Icons.schedule_rounded,
                      label: '20–30 min',
                    ),
                    const _InfoPill(
                      icon: Icons.circle,
                      label: 'Cocina abierta',
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _BrandMark extends StatelessWidget {
  const _BrandMark();

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Container(
          width: 42,
          height: 42,
          decoration: const BoxDecoration(
            color: MesaFlowColors.charcoal,
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.restaurant_rounded,
            color: MesaFlowColors.white,
            size: 21,
          ),
        ),
        const SizedBox(width: 11),
        Text('MesaFlow', style: Theme.of(context).textTheme.titleLarge),
      ],
    );
  }
}

class _InfoPill extends StatelessWidget {
  const _InfoPill({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: MesaFlowColors.ivory.withValues(alpha: 0.72),
        borderRadius: BorderRadius.circular(99),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 15, color: MesaFlowColors.success),
            const SizedBox(width: 7),
            Text(label, style: Theme.of(context).textTheme.labelMedium),
          ],
        ),
      ),
    );
  }
}

class _EmptySearch extends StatelessWidget {
  const _EmptySearch();

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(
        vertical: 64,
        horizontal: MesaFlowSpacing.md,
      ),
      child: const Center(
        child: MesaFlowFeedbackPanel(
          title: 'No encontramos productos',
          message: 'Probá con otra búsqueda o categoría.',
          tone: MesaFlowFeedbackTone.neutral,
        ),
      ),
    );
  }
}
