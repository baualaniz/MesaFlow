import 'package:flutter/material.dart';

import '../data/demo_menu.dart';
import '../models/menu_product.dart';
import '../theme/mesaflow_theme.dart';
import '../widgets/product_card.dart';

class MenuPage extends StatefulWidget {
  const MenuPage({super.key});

  @override
  State<MenuPage> createState() => _MenuPageState();
}

class _MenuPageState extends State<MenuPage> {
  final _searchController = TextEditingController();
  final Map<String, int> _cart = {};
  String _category = 'Todos';
  String _query = '';

  List<MenuProduct> get _visibleProducts {
    final query = _query.trim().toLowerCase();
    return demoProducts
        .where((product) {
          final inCategory =
              _category == 'Todos' || product.category == _category;
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
    final product = demoProducts.firstWhere((item) => item.id == entry.key);
    return sum + product.priceInCents * entry.value;
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
                label: Text('Agregar · ${formatPrice(product.priceInCents)}'),
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
                          demoProducts
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
                    formatPrice(_total),
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
            SliverToBoxAdapter(child: _Header(itemCount: _itemCount)),
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
                          onChanged: (value) => setState(() => _query = value),
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
                              for (final category in demoCategories)
                                Padding(
                                  padding: const EdgeInsets.only(right: 10),
                                  child: ChoiceChip(
                                    label: Text(category),
                                    selected: _category == category,
                                    onSelected: (_) =>
                                        setState(() => _category = category),
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
                    Text(formatPrice(_total)),
                  ],
                ),
              ),
            ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({required this.itemCount});

  final int itemCount;

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
                  'Bienvenidos a\nCasa Jacarandá',
                  style: Theme.of(context).textTheme.displaySmall,
                ),
                const SizedBox(height: 14),
                Wrap(
                  spacing: 10,
                  runSpacing: 10,
                  children: const [
                    _InfoPill(
                      icon: Icons.table_restaurant_outlined,
                      label: 'Mesa 12',
                    ),
                    _InfoPill(icon: Icons.schedule_rounded, label: '20–30 min'),
                    _InfoPill(icon: Icons.circle, label: 'Cocina abierta'),
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
      padding: const EdgeInsets.symmetric(vertical: 64),
      child: Column(
        children: [
          const Icon(Icons.search_off_rounded, size: 44),
          const SizedBox(height: 12),
          Text(
            'No encontramos productos',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 4),
          const Text('Probá con otra búsqueda o categoría.'),
        ],
      ),
    );
  }
}
