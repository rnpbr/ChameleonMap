#!/usr/bin/env python3
"""Generate benchmark map data as SQL for a django-tenants scoped schema."""

from __future__ import annotations

import argparse
import math
import os
import random
from dataclasses import dataclass, field
from typing import Iterable, Sequence


COLORS = [
    "#E74C3C",
    "#3498DB",
    "#2ECC71",
    "#F39C12",
    "#9B59B6",
    "#1ABC9C",
    "#E67E22",
    "#34495E",
    "#16A085",
    "#C0392B",
]

CENTER_LAT = -15.0
CENTER_LON = -47.0
GRID_SPAN_DEG = 12.0


def sql_str(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def sql_bool(value: bool) -> str:
    return "true" if value else "false"


def sql_decimal(value: float, places: int = 6) -> str:
    return f"{value:.{places}f}"


def batched(rows: Sequence[str], size: int) -> Iterable[list[str]]:
    for index in range(0, len(rows), size):
        yield list(rows[index : index + size])


@dataclass
class GeneratedData:
    schema: str
    menu_groups: list[tuple[int, str, bool]] = field(default_factory=list)
    menus: list[tuple[int, str, int, int, bool]] = field(default_factory=list)
    locations: list[tuple[int, str, str, float, float, bool]] = field(default_factory=list)
    tags: list[tuple[int, str, int, str, str, bool]] = field(default_factory=list)
    tag_related_locations: list[tuple[int, int]] = field(default_factory=list)
    tag_relationships: list[tuple[int, int, int, int | None]] = field(default_factory=list)
    links_groups: list[tuple[int, str, str, float, int]] = field(default_factory=list)
    links: list[tuple[int, str, int, int, int, float, int, bool, bool, bool]] = field(
        default_factory=list
    )


def generate_data(
    schema: str,
    *,
    num_locations: int,
    num_tags: int,
    num_links: int,
    num_menu_groups: int,
    menus_per_group: int,
    seed: int,
) -> GeneratedData:
    rng = random.Random(seed)
    data = GeneratedData(schema=schema)

    for group_id in range(1, num_menu_groups + 1):
        simultaneous = group_id % 2 == 0
        data.menu_groups.append((group_id, f"Menu Group {group_id}", simultaneous))

    menu_id = 1
    for group_id, _, _ in data.menu_groups:
        for menu_index in range(menus_per_group):
            hierarchy = 0 if menu_index < menus_per_group // 2 else 1
            data.menus.append(
                (
                    menu_id,
                    f"Group{group_id} Menu {menu_index + 1}",
                    group_id,
                    hierarchy,
                    True,
                )
            )
            menu_id += 1

    grid_size = max(1, math.ceil(math.sqrt(num_locations)))
    lat_step = GRID_SPAN_DEG / grid_size
    lon_step = GRID_SPAN_DEG / grid_size

    for location_id in range(1, num_locations + 1):
        row = (location_id - 1) // grid_size
        col = (location_id - 1) % grid_size
        lat = CENTER_LAT - GRID_SPAN_DEG / 2 + row * lat_step + rng.uniform(-0.02, 0.02)
        lon = CENTER_LON - GRID_SPAN_DEG / 2 + col * lon_step + rng.uniform(-0.02, 0.02)
        lat = max(-90.0, min(90.0, lat))
        lon = max(-180.0, min(180.0, lon))
        data.locations.append(
            (
                location_id,
                f"Location {location_id}",
                f"<p>Benchmark location {location_id}</p>",
                lat,
                lon,
                True,
            )
        )

    menu_ids = [menu[0] for menu in data.menus]
    tags_per_menu = max(1, num_tags // len(menu_ids))
    tag_id = 1
    for menu in data.menus:
        menu_id = menu[0]
        for tag_index in range(tags_per_menu):
            if tag_id > num_tags:
                break
            color = COLORS[(tag_id - 1) % len(COLORS)]
            data.tags.append(
                (
                    tag_id,
                    f"Tag {tag_id} (Menu {menu_id})",
                    menu_id,
                    color,
                    f"<p>Description for tag {tag_id}</p>",
                    True,
                )
            )
            num_related = rng.randint(1, 3)
            chosen_locations = rng.sample(range(1, num_locations + 1), k=min(num_related, num_locations))
            for location_id in chosen_locations:
                data.tag_related_locations.append((tag_id, location_id))
            tag_id += 1
        if tag_id > num_tags:
            break

    while tag_id <= num_tags:
        menu_id = rng.choice(menu_ids)
        color = COLORS[(tag_id - 1) % len(COLORS)]
        data.tags.append(
            (
                tag_id,
                f"Tag {tag_id} (Menu {menu_id})",
                menu_id,
                color,
                f"<p>Description for tag {tag_id}</p>",
                True,
            )
        )
        num_related = rng.randint(1, 3)
        chosen_locations = rng.sample(range(1, num_locations + 1), k=min(num_related, num_locations))
        for location_id in chosen_locations:
            data.tag_related_locations.append((tag_id, location_id))
        tag_id += 1

    tag_ids = [tag[0] for tag in data.tags]
    relationship_targets = rng.sample(tag_ids, k=max(1, len(tag_ids) // 4))
    relationship_id = 1
    for child_tag_id in relationship_targets:
        parent_candidates = [tag_id for tag_id in tag_ids if tag_id != child_tag_id]
        if not parent_candidates:
            continue
        parent_count = rng.randint(1, min(3, len(parent_candidates)))
        parents = rng.sample(parent_candidates, k=parent_count)
        for parent_index, parent_tag_id in enumerate(parents):
            cluster_id = (parent_index % 3) + 1
            data.tag_relationships.append(
                (relationship_id, child_tag_id, parent_tag_id, cluster_id)
            )
            relationship_id += 1

    for menu in data.menus:
        menu_id = menu[0]
        links_group_id = len(data.links_groups) + 1
        color = COLORS[(links_group_id - 1) % len(COLORS)]
        data.links_groups.append(
            (links_group_id, f"Links Group {menu_id}", color, 0.6, menu_id)
        )

    links_group_ids = [group[0] for group in data.links_groups]
    used_pairs: set[tuple[int, int]] = set()
    link_id = 1
    attempts = 0
    max_attempts = num_links * 20
    while link_id <= num_links and attempts < max_attempts:
        attempts += 1
        loc1 = rng.randint(1, num_locations)
        loc2 = rng.randint(1, num_locations)
        if loc1 == loc2:
            continue
        pair = tuple(sorted((loc1, loc2)))
        if pair in used_pairs:
            continue
        used_pairs.add(pair)
        links_group_id = rng.choice(links_group_ids)
        curvature = round(rng.uniform(1.0, 4.0), 3)
        weight = rng.randint(2, 6)
        dashed = rng.random() < 0.15
        straight = rng.random() < 0.10
        invert = rng.random() < 0.10
        data.links.append(
            (
                link_id,
                f"Link {link_id}",
                loc1,
                loc2,
                links_group_id,
                curvature,
                weight,
                dashed,
                straight,
                invert,
            )
        )
        link_id += 1

    return data


def render_insert(table: str, columns: Sequence[str], rows: Sequence[str], batch_size: int = 500) -> list[str]:
    if not rows:
        return []
    column_list = ", ".join(columns)
    statements: list[str] = []
    for batch in batched(rows, batch_size):
        statements.append(
            f"INSERT INTO {table} ({column_list}) VALUES\n  "
            + ",\n  ".join(batch)
            + ";"
        )
    return statements


def render_sql(data: GeneratedData) -> str:
    lines: list[str] = [
        "-- Generated benchmark map data",
        f"-- Schema: {data.schema}",
        "BEGIN;",
        f"SET search_path TO {data.schema};",
        "",
        "TRUNCATE link, tag_related_locations, tag_relationship, tag,",
        "         links_group, location, kml_shapes, menu, menugroup, map_config",
        "RESTART IDENTITY CASCADE;",
        "",
    ]

    menu_group_rows = [
        f"({group_id}, {sql_str(name)}, {sql_bool(simultaneous)})"
        for group_id, name, simultaneous in data.menu_groups
    ]
    lines.extend(render_insert("menugroup", ("id", "name", "simultaneous_context"), menu_group_rows))
    lines.append("")

    menu_rows = [
        f"({menu_id}, {sql_str(name)}, {group_id}, {hierarchy}, {sql_bool(active)})"
        for menu_id, name, group_id, hierarchy, active in data.menus
    ]
    lines.extend(render_insert("menu", ("id", "name", "group_id", "hierarchy_level", "active"), menu_rows))
    lines.append("")

    location_rows = [
        f"({location_id}, {sql_str(name)}, {sql_str(description)}, "
        f"{sql_decimal(lat, 8)}, {sql_decimal(lon, 8)}, NULL, {sql_bool(active)})"
        for location_id, name, description, lat, lon, active in data.locations
    ]
    lines.extend(
        render_insert(
            "location",
            ("id", "name", "description", "latitude", "longitude", "overlayed_popup_content", "active"),
            location_rows,
        )
    )
    lines.append("")

    tag_rows = [
        f"({tag_id}, {sql_str(name)}, {sql_str(color)}, {sql_str(description)}, "
        f"NULL, NULL, {parent_menu_id}, {sql_bool(active)})"
        for tag_id, name, parent_menu_id, color, description, active in data.tags
    ]
    lines.extend(
        render_insert(
            "tag",
            (
                "id",
                "name",
                "color",
                "description",
                "sidebar_content",
                "overlayed_popup_content",
                "parent_menu_id",
                "active",
            ),
            tag_rows,
        )
    )
    lines.append("")

    tag_location_rows = [
        f"({tag_id}, {location_id})" for tag_id, location_id in data.tag_related_locations
    ]
    lines.extend(
        render_insert("tag_related_locations", ("tag_id", "location_id"), tag_location_rows)
    )
    lines.append("")

    relationship_rows = [
        f"({relationship_id}, {child_tag_id}, {parent_tag_id}, {cluster_id if cluster_id is not None else 'NULL'})"
        for relationship_id, child_tag_id, parent_tag_id, cluster_id in data.tag_relationships
    ]
    lines.extend(
        render_insert(
            "tag_relationship",
            ("id", "child_tag_id", "parent_tag_id", "cluster_id"),
            relationship_rows,
        )
    )
    lines.append("")

    links_group_rows = [
        f"({group_id}, {sql_str(name)}, {sql_str(color)}, {sql_decimal(opacity, 3)}, NULL, {parent_menu_id})"
        for group_id, name, color, opacity, parent_menu_id in data.links_groups
    ]
    lines.extend(
        render_insert(
            "links_group",
            ("id", "name", "links_color", "opacity", "sidebar_content", "parent_menu_id"),
            links_group_rows,
        )
    )
    lines.append("")

    link_rows = [
        f"({link_id}, {sql_str(name)}, NULL, {sql_decimal(curvature, 3)}, {weight}, "
        f"{sql_bool(dashed)}, {sql_bool(straight)}, {loc1}, {loc2}, {links_group_id}, {sql_bool(invert)})"
        for link_id, name, loc1, loc2, links_group_id, curvature, weight, dashed, straight, invert in data.links
    ]
    lines.extend(
        render_insert(
            "link",
            (
                "id",
                "display_name",
                "popup_description",
                "curvature",
                "weight",
                "dashed",
                "straight_link",
                "location_1_id",
                "location_2_id",
                "links_group_id",
                "invert_link",
            ),
            link_rows,
        )
    )
    lines.append("")

    lines.append(
        "INSERT INTO map_config ("
        "id, map_name, map_style, inherit_children_tag_locations, cluster_close_tags, "
        "initial_zoom_level, initial_latitude, initial_longitude, link_feature, "
        "hide_menu_group_when_unique, footer_file"
        ") VALUES ("
        "1, 'Benchmark Map', 'd', true, true, 5, "
        f"{sql_decimal(CENTER_LAT, 6)}, {sql_decimal(CENTER_LON, 6)}, true, true, ''"
        ");"
    )
    lines.append("")

    for table in (
        "menugroup",
        "menu",
        "location",
        "tag",
        "tag_relationship",
        "links_group",
        "link",
        "map_config",
    ):
        lines.append(
            f"SELECT setval(pg_get_serial_sequence('{data.schema}.{table}', 'id'), "
            f"COALESCE((SELECT MAX(id) FROM {data.schema}.{table}), 1));"
        )

    lines.extend(["", "COMMIT;", ""])
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schema", default="example")
    parser.add_argument("--locations", type=int, default=20000)
    parser.add_argument("--tags", type=int, default=2400)
    parser.add_argument("--links", type=int, default=3200)
    parser.add_argument("--menu-groups", type=int, default=6)
    parser.add_argument("--menus-per-group", type=int, default=8)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument(
        "--output",
        default="docs/examples/generated/example_map_data.sql",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data = generate_data(
        args.schema,
        num_locations=args.locations,
        num_tags=args.tags,
        num_links=args.links,
        num_menu_groups=args.menu_groups,
        menus_per_group=args.menus_per_group,
        seed=args.seed,
    )
    sql = render_sql(data)
    output_path = args.output
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as handle:
        handle.write(sql)
    print(f"Wrote {output_path}")
    print(
        "Counts:",
        f"menu_groups={len(data.menu_groups)}",
        f"menus={len(data.menus)}",
        f"locations={len(data.locations)}",
        f"tags={len(data.tags)}",
        f"tag_related_locations={len(data.tag_related_locations)}",
        f"tag_relationships={len(data.tag_relationships)}",
        f"links_groups={len(data.links_groups)}",
        f"links={len(data.links)}",
    )


if __name__ == "__main__":
    main()
