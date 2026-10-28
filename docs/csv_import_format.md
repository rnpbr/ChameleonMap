# CSV Import Format

This document describes how to prepare CSV files for importing data into the map administration panel.

---

## Overview

The import accepts **up to three CSV files** — one for each entity type — either uploaded individually or packaged in a **ZIP archive**:

| File | Creates | Also infers |
|---|---|---|
| `locations.csv` | Locations | — |
| `tags.csv` | Tags | Menu Groups, Menus |
| `links.csv` | Links | Links Groups |

You do not need to provide all three files. Any combination is valid (e.g. uploading only `locations.csv` is fine).

### How files are identified

The system identifies which file is which **automatically** using this priority:

1. **Filename heuristic** — if the filename contains `location`, `tag`, or `link` (case-insensitive), it is treated as that type.
2. **Column headers** — if the filename doesn't match, the headers are inspected:
   - Contains `latitude` and `longitude` → locations file
   - Contains `menu_name` → tags file
   - Contains `location_1` and `location_2` → links file

If the system cannot identify a file, it will report an error and ask you to rename or correct the file.

### Referencing other entities

All references between entities use **names**, not numeric IDs.

For example, in `tags.csv`, the `menu_name` column contains the menu's name as a plain string. If a menu with that name already exists in the database, it is reused. If not, a new menu is created.

The same applies to locations referenced in `related_locations` (tags) or `location_1`/`location_2` (links): if a location name already exists in the database but is not in the current upload, it is still resolved correctly.

---

## File Formats

### `locations.csv`

Each row represents one location (a point on the map).

| Column | Required | Default | Description |
|---|---|---|---|
| `name` | **yes** | — | Unique location name |
| `latitude` | **yes** | — | Decimal number, -90 to 90 |
| `longitude` | **yes** | — | Decimal number, -180 to 180 |
| `description` | no | *(empty)* | Plain text description |
| `active` | no | `True` | `True` or `False` |

**Example:**

```csv
name,latitude,longitude,description,active
São Paulo Datacenter,-23.5489,-46.6388,Main datacenter,True
Brasília Hub,-15.7801,-47.9292,,True
Rio de Janeiro Node,-22.9068,-43.1729,Secondary node,True
```

---

### `tags.csv`

Each row represents one tag. The **Menu Group** and **Menu** that each tag belongs to are inferred from the `menu_group_name` and `menu_name` columns — you do not need to create a separate file for menus.

| Column | Required | Default | Description |
|---|---|---|---|
| `name` | **yes** | — | Tag name |
| `menu_name` | **yes** | — | Name of the menu this tag belongs to. The menu is created if it does not exist. |
| `menu_group_name` | no | `Default` | Name of the menu group. Defaults to `"Default"` if omitted. |
| `menu_hierarchy_level` | no | `0` | Integer. Menus with the same level are siblings. Lower numbers are parents of higher numbers. |
| `color` | no | `#FF0000` | Hex color in `#RRGGBB` format (e.g. `#3498DB`). |
| `description` | no | *(empty)* | Plain text shown in the popup when a user clicks the tag on the map. |
| `related_locations` | no | *(empty)* | Location names separated by `;`. The locations must exist in this upload or in the database. |
| `active` | no | `True` | `True` or `False` |

**Example:**

```csv
name,menu_name,menu_group_name,menu_hierarchy_level,color,description,related_locations,active
Cisco Router,Routers,Infrastructure,1,#E74C3C,Cisco networking equipment,São Paulo Datacenter;Rio de Janeiro Node,True
Juniper Switch,Switches,Infrastructure,1,#3498DB,Juniper layer-2 switch,Brasília Hub,True
Linux Server,Servers,Compute,1,#2ECC71,,São Paulo Datacenter,True
```

> **Tip:** All rows sharing the same `menu_name` will be placed under the same menu. The hierarchy level and menu group are taken from the **first** row seen for each menu name.

---

### `links.csv`

Each row represents one link (a line drawn between two locations on the map). The **Links Group** is inferred from the `link_group_name` column.

| Column | Required | Default | Description |
|---|---|---|---|
| `name` | **yes** | — | Display name for the link |
| `location_1` | **yes** | — | Name of the first endpoint location |
| `location_2` | **yes** | — | Name of the second endpoint location |
| `link_group_name` | no | `Default Links` | Name of the links group. Defaults to `"Default Links"` if omitted. |
| `link_group_menu` | no | *(none)* | Menu name to associate with this links group |
| `link_group_color` | no | `#FF0000` | Hex color for the links group lines |
| `link_group_opacity` | no | `0.6` | Line opacity, `0.0` (transparent) to `1.0` (opaque) |
| `curvature` | no | `2.0` | Line curvature, `1.0` (very curved) to `4.0` (less curved) |
| `weight` | no | `3` | Line thickness (integer) |
| `dashed` | no | `False` | `True` or `False` — makes the line dashed |
| `straight_link` | no | `False` | `True` or `False` — overrides curvature and draws a straight line |
| `invert_link` | no | `False` | `True` or `False` — inverts the curvature direction |
| `popup_description` | no | *(empty)* | Text shown when user clicks the link on the map |

**Example:**

```csv
name,location_1,location_2,link_group_name,link_group_menu,link_group_color,link_group_opacity,curvature,weight,dashed,straight_link,invert_link,popup_description
SP-to-BSB fiber,São Paulo Datacenter,Brasília Hub,Fiber Links,Routers,#0000FF,0.8,2.0,4,False,False,False,Primary fiber backbone
BSB-to-RJ fiber,Brasília Hub,Rio de Janeiro Node,Fiber Links,,,,,,,,,Secondary fiber path
SP-to-RJ copper,São Paulo Datacenter,Rio de Janeiro Node,Copper Links,,,#FF8800,,2,True,,,Legacy copper link
```

> **Tip:** All rows sharing the same `link_group_name` will be placed under the same links group. The group's color, opacity, and menu are taken from the **first** row seen for each group name.

---

## ZIP Upload

Instead of uploading CSV files individually, you can pack them into a single `.zip` file.

- The ZIP may contain any combination of the three CSV files.
- Files inside subdirectories are also recognized.
- macOS `__MACOSX` metadata directories are automatically skipped.
- File detection works the same way as for individual uploads (by filename or column headers).

---

## Validation

Before any data is applied to the database, the system validates your files. All errors are reported at once, so you can fix everything in one go.

**Errors that prevent import:**
- A required column is missing from the header row
- A required field is empty in a data row
- `latitude` or `longitude` is not a valid number, or is out of range
- A color value does not match the `#RRGGBB` format
- A numeric field (e.g. `opacity`, `curvature`, `weight`) is not a valid number or is out of allowed range
- A boolean field (e.g. `active`, `dashed`) is not `True` or `False`

**Warnings (reported but do not block import):**
- Duplicate names within the same file

---

## Diff and Confirmation

After uploading and validating, the system compares your files against the **current state of the database** and shows you a **diff page** listing:

- **Added** — records that will be created
- **Edited** — records that will be updated (showing old vs. new values)
- **Removed** — records that exist in the database but are not in your upload

You can **select or deselect individual changes** before applying them. Only checked items are written to the database.

---

## Unsupported Features

The following are **not supported** by CSV import and must be managed manually through the administration panel:

- **Tag-to-tag relationships** — the complex parent/child tag relationships with cluster IDs
- **KML Shapes** — uploading KML files and their styling
- **HTML content** — `description`, `sidebar_content`, and `popup_description` fields only accept plain text via CSV; rich HTML must be edited manually after import
- **Map Settings** — initial map zoom, position, and configuration options

---

## Tips and Best Practices

- **Column order does not matter** — columns can appear in any order in the CSV.
- **Extra columns are ignored** — if your spreadsheet has additional columns, they are silently ignored.
- **Empty optional fields** use the default values listed in each table.
- **Boolean values** are case-insensitive: `true`, `True`, `TRUE`, and `1` all work; same for `false`.
- **Color values** must include the `#` prefix: use `#FF0000`, not `FF0000`.
- **Name matching is case-sensitive** — `"Site A"` and `"site a"` are treated as different locations.
- **Semicolons in location names** are not supported in `related_locations` because `;` is used as the separator. Rename locations to avoid semicolons if needed.
- For best spreadsheet compatibility, **save as CSV with UTF-8 encoding** (in Excel: "Save As" → "CSV UTF-8 (Comma delimited)").
