# Product Discovery Sections (Trending, Deals, Bestsellers)

## Core Idea

- Do NOT create separate tables for each section (bestsellers, trending, etc.).
- Use:
  - Source tables → real business data
  - Derived/cache tables → precomputed rankings
  - Cron jobs → update derived tables
  - APIs → read from derived tables for speed

---

## Source Tables (Primary Data)

### products

- id
- name
- price
- category_id
- brand_id
- stock
- created_at
- discount_percent
- is_featured
- is_bundle
- deal_start_at
- deal_end_at
- restocked_at

### orders

- id
- user_id
- created_at

### order_items

- id
- order_id
- product_id
- quantity

### reviews

- id
- product_id
- rating

### wishlist_items

- id
- user_id
- product_id

### product_views

- id
- product_id
- user_id
- created_at

---

## Product Sections → Implementation Mapping

### Direct DB fields (simple filters)

- New Arrivals → `ORDER BY created_at DESC`
- Today’s Deals → `deal_start_at`, `deal_end_at`
- Featured → `is_featured`
- Limited Stock → `stock`
- Clearance → `discount_percent`
- Premium/Budget → `price`
- Bundle → `is_bundle`
- Seasonal → `season_tag`
- Back in Stock → `restocked_at`
- Category sections → `category_id`
- Brand sections → `brand_id`

---

### Computed Aggregations (from relational data)

- Bestsellers → `SUM(order_items.quantity)`
- Top Rated → `AVG(reviews.rating)`
- Most Reviewed → `COUNT(reviews)`
- Popular in Category → grouped orders
- Frequently Bought Together → order co-occurrence
- Similar Products → category + attributes
- Trending → recent views + orders

---

## Derived / Cache Tables (Performance Layer)

These are REAL tables in the same DB as `products`, but store precomputed results.

### product_metrics_daily

Aggregated metrics per product per day.

Fields:

- product_id
- date
- sales_count
- views_count
- wishlist_count
- rating_avg

Sources:

- orders
- product_views
- wishlist_items
- reviews

Purpose:

- Base table for trending/bestsellers.

---

### product_bestsellers

Precomputed bestseller rankings.

Fields:

- product_id
- rank
- period (7d / 30d)
- score (sales)

---

### product_trending

Recent activity-based ranking.

Fields:

- product_id
- trend_score
- computed_at

Example formula:
trend*score = (views_24h * 0.4) + (orders*24h * 0.6)

---

## Cron Jobs (Data Pipeline)

Tables are created once via migration.
Cron jobs only update data.

Recommended schedule:

- Trending → every 1 hour
- Bestsellers → every 6–24 hours
- Metrics → daily

Flow:

1. Read raw data (orders, views, wishlist)
2. Aggregate
3. Upsert into derived tables

---

## API Design (Fast Reads)

GET /products/new-arrivals  
→ products table

GET /products/deals  
→ products table

GET /products/bestsellers  
→ product_bestsellers JOIN products

GET /products/trending  
→ product_trending JOIN products

GET /products/top-rated  
→ product_metrics_daily JOIN products

Example query:

```sql
SELECT p.*
FROM product_bestsellers pb
JOIN products p ON p.id = pb.product_id
ORDER BY pb.rank
LIMIT 20;
```
