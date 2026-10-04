import 'package:flutter/material.dart';

import '../cart/cart_controller.dart';
import '../cart/cart_store.dart';
import '../contracts/domain_contracts.dart';
import '../menu/menu_repository.dart';
import '../models/menu_product.dart';
import '../models/product_selection.dart';
import '../routing/customer_routes.dart';
import '../session/qr_session.dart';
import '../theme/mesaflow_theme.dart';
import '../widgets/cart_sheet.dart';
import '../widgets/feedback_panel.dart';
import '../widgets/product_card.dart';
import '../widgets/product_detail_sheet.dart';

class MenuPage extends StatefulWidget {
  const MenuPage({
    super.key,
    required this.tableRoute,
    required this.sessionAccess,
    required this.menuRepository,
    required this.cartStore,
  });

  final CustomerTableRoute tableRoute;
  final QrSessionAccess sessionAccess;
  final MenuRepository menuRepository;
  final CartStore cartStore;

  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  final _searchController = TextEditingController();
  late CartController _cartController;
  MenuCatalog? _catalog;
  Object? _loadError;
  bool _loading = true;
  String? _categoryId;
  String _query = '';
  int _loadGeneration = 0;

  @override
  void initState() {
    super.initState();
    _cartController = _createCartController();
    _cartController.addListener(_onCartChanged);
    _loadMenu();
  }

  @override
  void didUpdateWidget(covariant MenuPage oldWidget) {
    super.didUpdateWidget(oldWidget);
    final cartScopeChanged =
        oldWidget.sessionAccess.establishmentId !=
            widget.sessionAccess.establishmentId ||
        oldWidget.sessionAccess.sessionId != widget.sessionAccess.sessionId ||
        oldWidget.cartStore != widget.cartStore;
    if (cartScopeChanged) {
      _cartController.removeListener(_onCartChanged);
      _cartController.dispose();
      _cartController = _createCartController();
      _cartController.addListener(_onCartChanged);
    }
    if (cartScopeChanged || oldWidget.menuRepository != widget.menuRepository) {
      _loadMenu();
    }
  }

  CartController _createCartController() => CartController(
    store: widget.cartStore,
    scope: CartScope(
      establishmentId: widget.sessionAccess.establishmentId,
      sessionId: widget.sessionAccess.sessionId,
    ),
  );

  void _onCartChanged() {
    if (mounted) setState(() {});
  }

  Future<void> _loadMenu() async {
    final generation = ++_loadGeneration;
    final cartController = _cartController;
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      final catalog = await widget.menuRepository.loadPublishedMenu(
        widget.sessionAccess.establishmentId,
      );
      await cartController.restore(catalog);
      if (!mounted ||
          generation != _loadGeneration ||
          cartController != _cartController) {
        return;
      }
      setState(() {
        _catalog = catalog;
        _loading = false;
        _categoryId = null;
      });
      if (cartController.restoredWithError) {
        WidgetsBinding.instance.addPostFrameCallback((_) {
          if (mounted) {
            _showCartMessage(
              'El carrito guardado no era válido y se reinició de forma segura.',
            );
          }
        });
      }
    } catch (error) {
      if (!mounted || generation != _loadGeneration) return;
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

  int get _itemCount => _cartController.itemCount;

  int get _total => _cartController.totalMinor;

  @override
  void dispose() {
    _cartController.removeListener(_onCartChanged);
    _cartController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _add(MenuProduct product) async {
    await _addSelection(ProductSelection.create(product: product, quantity: 1));
  }

  Future<void> _addSelection(ProductSelection selection) async {
    final result = await _cartController.add(selection);
    if (!mounted) return;
    final message = switch (result) {
      CartMutationResult.success =>
        '${selection.quantity} × ${selection.product.name} agregado al pedido',
      CartMutationResult.quantityLimit =>
        'Este producto admite hasta '
            '${maxQuantityForProduct(selection.product)} unidades por línea.',
      CartMutationResult.itemLimit =>
        'El pedido alcanzó el máximo de $maxOrderItems líneas.',
      CartMutationResult.busy => 'Esperá a que termine el cambio anterior.',
      CartMutationResult.persistenceError =>
        'No pudimos guardar el producto. Intentá nuevamente.',
    };
    _showCartMessage(message);
  }

  void _showCartMessage(String message) {
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: const Duration(milliseconds: 900),
          content: Text(message),
        ),
      );
  }

  Future<void> _showProduct(MenuProduct product) async {
    final selection = await showModalBottomSheet<ProductSelection>(
      context: context,
      isScrollControlled: true,
      backgroundColor: MesaFlowColors.white,
      showDragHandle: true,
      builder: (context) => ProductDetailSheet(product: product),
    );
    if (selection != null && mounted) await _addSelection(selection);
  }

  void _showCart() {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) =>
          CartSheet(controller: _cartController, onMessage: _showCartMessage),
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
                      formatPrice(
                        Money(
                          amountMinor: _total,
                          currency: _cartController
                              .lines
                              .first
                              .product
                              .price
                              .currency,
                        ),
                      ),
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
