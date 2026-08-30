# Adding products via the listings pipeline

1. Copy `incoming/listings-template.csv` to `incoming/listings.csv`.
2. Fill in one row per product (see column reference below).
3. Drop the referenced photos into `incoming/images/` — filenames must match
   the CSV exactly (case-sensitive).
4. Run `npm run import-listings`.

The script validates each row, optimizes images with `sharp` into
`public/images/products/`, and regenerates `lib/generated-products.ts`
wholesale. It's idempotent — safe to re-run any time the CSV or images
change. Rows with missing required fields are skipped with a clear warning
in the console; rows with a missing image file fall back to a placeholder
image (also warned) rather than failing the whole import.

## Column reference

| Column          | Required | Notes                                                                 |
| --------------- | -------- | ---------------------------------------------------------------------|
| `name`          | Yes      | Product name.                                                        |
| `category`      | Yes      | `women` or `men`.                                                    |
| `subcategory`   | Yes      | e.g. `Dresses`, `Outerwear`, `Knitwear`, `Shirts`, `T-Shirts`, `Bottoms`, `Accessories`. |
| `price`         | Yes      | Number, no currency symbol (e.g. `128`).                             |
| `compareAtPrice`| No       | Original price if on sale. Leave blank if not discounted.            |
| `description`   | No       | Short product description.                                           |
| `sizes`         | No       | `|`-separated list, e.g. `XS|S|M|L|XL`. Defaults to `XS,S,M,L,XL`.    |
| `image1`        | Yes      | Filename in `incoming/images/` (primary image).                      |
| `image2`        | No       | Filename in `incoming/images/` (hover image). Falls back to `image1` if blank. |
| `featured`      | No       | `yes`/`no`. Defaults to `no`.                                         |
| `isNew`         | No       | `yes`/`no`. Defaults to `no`.                                         |
| `trending`      | No       | `yes`/`no`. Defaults to `no`.                                         |

`lib/generated-products.ts` is machine-generated — never hand-edit it. Edit
`incoming/listings.csv` and re-run the import instead.
