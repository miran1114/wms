from __future__ import annotations

import random
from datetime import timedelta
from typing import List

from django.core.management.base import BaseCommand
from django.utils import timezone

from inventory.models import Inventory, Product, Transaction
from market.models import MarketData
from pricing.models import PricingLog


class Command(BaseCommand):
    help = "生成模拟的WMS数据：可指定商品数量与市场数据天数"

    def add_arguments(self, parser):
        parser.add_argument(
            "--count",
            type=int,
            default=50,
            help="生成商品数量，默认50",
        )
        parser.add_argument(
            "--days",
            type=int,
            default=30,
            help="为每个商品生成的市场数据天数，默认30",
        )

    def handle(self, *args, **options):
        count: int = max(1, int(options.get("count", 50)))
        days: int = max(1, int(options.get("days", 30)))
        categories = ["电子产品", "日用品", "食品饮料", "服装鞋帽", "家居家电"]
        products: List[Product] = []

        for i in range(count):
            sku = f"SKU{i:04d}"
            cost = round(random.uniform(10, 500), 2)
            category = random.choice(categories)
            name = f"{category}-{i}"
            selling = round(cost * random.uniform(1.1, 1.8), 2)
            p, _ = Product.objects.get_or_create(
                sku=sku,
                defaults={
                    "name": name,
                    "category": category,
                    "cost_price": cost,
                    "current_selling_price": selling,
                },
            )
            products.append(p)

        for p in products:
            base_demand = random.randint(35, 85)
            base_price = float(p.current_selling_price)
            inv_qty = random.randint(80, 500)
            safety = max(20, int(base_demand * 1.2))
            inv, _ = Inventory.objects.update_or_create(
                product=p,
                defaults={"quantity": inv_qty, "location": "MAIN", "min_safety_stock": safety, "max_capacity": 1000},
            )

            running_price = base_price
            running_stock = inv_qty

            for d in range(days):
                day = timezone.now() - timedelta(days=days - 1 - d)
                # 市场数据：需求高 -> 价格上行，竞争对手价格也偏高
                demand = max(0, min(100, int(base_demand + random.gauss(0, 10))))
                drift = (demand - 50) / 100.0
                market_price = max(1.0, round(running_price * (1 + drift * 0.2 + random.uniform(-0.03, 0.03)), 2))
                competitor_price = max(1.0, round(market_price * random.uniform(0.95, 1.05), 2))
                MarketData.objects.create(
                    product=p,
                    market_price=market_price,
                    demand_index=demand,
                    competitor_price=competitor_price,
                    recorded_at=day,
                )

                # 价格历史：每日微调
                new_price = max(1.0, round(running_price * (1 + random.uniform(-0.02, 0.04)), 2))
                PricingLog.objects.create(
                    product=p,
                    old_price=running_price,
                    new_price=new_price,
                    reason="每日价格波动",
                    created_at=day,
                )
                running_price = new_price

                # 库存历史：模拟出入库（减少 0 值概率）
                sales_factor = 0.3 + (demand / 100.0) * 0.6  # 0.3 ~ 0.9
                base_sales = int(sales_factor * (10 + min(running_stock, 200) * 0.2))
                sold = int(max(0, min(running_stock, base_sales + random.randint(0, 5))))
                if sold == 0 and demand > 60 and running_stock > 0:
                    sold = 1

                # 当库存低于安全库存时提高补货量与概率
                restock = 0
                if running_stock < safety:
                    if random.random() < 0.7:
                        restock = random.randint(20, 80)
                elif running_stock < safety * 1.5:
                    if random.random() < 0.3:
                        restock = random.randint(10, 30)
                else:
                    if random.random() < 0.1:
                        restock = random.randint(5, 15)

                if sold > 0:
                    Transaction.objects.create(product=p, quantity=sold, kind=Transaction.KIND_OUT, created_at=day)
                    running_stock = max(0, running_stock - sold)
                if restock > 0:
                    Transaction.objects.create(product=p, quantity=restock, kind=Transaction.KIND_IN, created_at=day)
                    running_stock = running_stock + restock

            # 将库存最终回写
            inv.quantity = running_stock
            inv.save(update_fields=["quantity"])

        self.stdout.write(self.style.SUCCESS(f"Mock数据生成完成：商品 {len(products)} 个，每个 {days} 天市场数据"))
