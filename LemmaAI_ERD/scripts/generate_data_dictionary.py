import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "collieAI.sql"
OUTPUT = ROOT / "DATA_DICTIONARY.md"


def split_top_level(text: str) -> list[str]:
    parts, current = [], []
    depth = 0
    quote = None
    i = 0
    while i < len(text):
        ch = text[i]
        if quote:
            current.append(ch)
            if ch == quote:
                if i + 1 < len(text) and text[i + 1] == quote:
                    current.append(text[i + 1])
                    i += 1
                else:
                    quote = None
        else:
            if ch in "'\"":
                quote = ch
                current.append(ch)
            elif ch == "(":
                depth += 1
                current.append(ch)
            elif ch == ")":
                depth -= 1
                current.append(ch)
            elif ch == "," and depth == 0:
                parts.append("".join(current).strip())
                current = []
            else:
                current.append(ch)
        i += 1
    if "".join(current).strip():
        parts.append("".join(current).strip())
    return parts


def table_blocks(sql: str):
    pattern = re.compile(r"CREATE\s+TABLE\s+(?:public\.)?([a-zA-Z_][\w]*)\s*\(", re.I)
    for match in pattern.finditer(sql):
        start = match.end()
        depth, quote, i = 1, None, start
        while i < len(sql) and depth:
            ch = sql[i]
            if quote:
                if ch == quote:
                    if i + 1 < len(sql) and sql[i + 1] == quote:
                        i += 1
                    else:
                        quote = None
            elif ch in "'\"":
                quote = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            i += 1
        yield match.group(1), sql[start:i - 1]


TYPE_RE = re.compile(
    r"^(?P<name>[a-zA-Z_][\w]*)\s+(?P<type>"
    r"DOUBLE\s+PRECISION|TIMESTAMP(?:TZ)?|TIMESTAMPTZ|SMALLINT|BIGINT|INTEGER|INT|"
    r"BOOLEAN|UUID|JSONB?|DATE|TEXT\[\]|TEXT|CHAR\s*\(\s*\d+\s*\)|"
    r"VARCHAR\s*\(\s*\d+\s*\)|NUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\)"
    r")(?P<rest>[\s\S]*)$",
    re.I,
)


def normalize_type(value: str) -> str:
    return re.sub(r"\s+", " ", value.upper()).replace(" (", "(")


def format_and_size(data_type: str):
    upper = data_type.upper()
    if upper in {"INT", "INTEGER"}: return "Whole number", "4 bytes"
    if upper == "SMALLINT": return "Whole number", "2 bytes"
    if upper == "BIGINT": return "Whole number", "8 bytes"
    if upper == "UUID": return "UUID string", "16 bytes"
    if upper == "BOOLEAN": return "TRUE or FALSE", "1 byte"
    if upper in {"TIMESTAMPTZ", "TIMESTAMP WITH TIME ZONE"}: return "YYYY-MM-DD HH:MM:SS±TZ", "8 bytes"
    if upper == "TIMESTAMP": return "YYYY-MM-DD HH:MM:SS", "8 bytes"
    if upper == "DATE": return "YYYY-MM-DD", "4 bytes"
    if upper == "DOUBLE PRECISION": return "Decimal number", "8 bytes"
    if upper.startswith("NUMERIC"):
        precision = re.search(r"\((\d+)\s*,\s*(\d+)\)", upper)
        return (f"Decimal ({precision.group(1)},{precision.group(2)})" if precision else "Decimal number", "Variable precision")
    if upper.startswith("VARCHAR") or upper.startswith("CHAR"):
        length = re.search(r"\((\d+)\)", upper).group(1)
        return "Text", f"{length} characters"
    if upper == "TEXT[]": return "Array of text values", "Variable"
    if upper in {"JSON", "JSONB"}: return "JSON object or array", "Variable"
    return "Free-form text", "Variable"


SPECIAL_DESCRIPTIONS = {
    "created_at": "Date and time the record was created",
    "updated_at": "Date and time the record was last updated",
    "is_active": "Indicates whether the record is active",
    "student_id": "Identifies the associated student",
    "teacher_id": "Identifies the associated teacher",
    "parent_id": "Identifies the associated parent or guardian",
    "session_id": "Identifies the associated AI tutoring session",
    "problem_id": "Identifies the associated mathematics problem",
    "skill_id": "Identifies the associated mathematics skill",
    "topic_id": "Identifies the associated mathematics topic",
    "message_id": "Identifies the associated AI message",
    "description": "Provides additional details about the record",
}


def description(name: str, table: str, is_pk: bool, fk_target: str | None):
    if is_pk:
        return f"Unique identifier for a record in `{table}`"
    if fk_target:
        return f"Links this record to `{fk_target}`"
    if name in SPECIAL_DESCRIPTIONS:
        return SPECIAL_DESCRIPTIONS[name]
    words = name.replace("_", " ")
    if name.startswith("is_"): return f"Indicates whether {words[3:]}"
    if name.endswith("_at"): return f"Date and time associated with {words[:-3]}"
    if name.endswith("_date"): return f"Date associated with {words[:-5]}"
    if name.endswith("_count"): return f"Number of {words[:-6]}"
    if name.endswith("_name"): return f"Name of the {words[:-5]}"
    if name.endswith("_status"): return f"Current {words}"
    if name.endswith("_text"): return f"Text content for {words[:-5]}"
    if name.endswith("_type"): return f"Classification used for {words[:-5]}"
    return f"Stores the {words} value"


def example(name: str, data_type: str):
    n, t = name.lower(), data_type.upper()
    if n == "email" or n.endswith("_email"): return "user@example.com"
    if n.endswith("_at"): return "2026-09-07 10:30:00+08"
    if n.endswith("_date") or t == "DATE": return "2026-09-07"
    if n == "currency_code": return "PHP"
    if n.endswith("_url"): return "https://example.com/file.png"
    if n == "grade_level": return "5"
    if n.endswith("_id") or t in {"INT", "INTEGER", "SMALLINT", "BIGINT"}: return "1"
    if t == "UUID": return "550e8400-e29b-41d4-a716-446655440000"
    if t == "BOOLEAN": return "TRUE"
    if t == "TEXT[]": return "{fractions,geometry}"
    if t in {"JSON", "JSONB"}: return '{"step": 1}'
    if t.startswith("NUMERIC") or t == "DOUBLE PRECISION": return "95.00"
    if "name" in n: return "Sample name"
    if "status" in n: return "active"
    if "text" in n or "description" in n: return "Sample text"
    return "Sample value"


def purpose(table: str) -> str:
    words = table.replace("_", " ")
    return f"Stores and manages {words}."


sql = SOURCE.read_text(encoding="utf-8")
foreign_keys = {}
alter_blocks = list(re.finditer(
    r"ALTER\s+TABLE\s+(?:public\.)?(\w+)\s+([\s\S]*?);",
    sql,
    re.I,
))
for alter in alter_blocks:
    child, body = alter.group(1), alter.group(2)
    for fk_match in re.finditer(
        r"FOREIGN\s+KEY\s*\(([^)]+)\)\s*REFERENCES\s+(?:public\.)?(\w+)\s*\(([^)]+)\)",
        body,
        re.I,
    ):
        child_cols, parent, parent_cols = fk_match.groups()
        for child_col, parent_col in zip(child_cols.split(","), parent_cols.split(",")):
            foreign_keys[(child.strip(), child_col.strip())] = f"{parent.strip()}.{parent_col.strip()}"

tables = {}
for table, body in table_blocks(sql):
    columns = []
    table_pk_cols = set()
    for item in split_top_level(body):
        pk_match = re.search(r"PRIMARY\s+KEY\s*\(([^)]+)\)", item, re.I)
        if item.lstrip().upper().startswith(("PRIMARY KEY", "CONSTRAINT")) and pk_match:
            table_pk_cols.update(c.strip() for c in pk_match.group(1).split(","))
            continue
        match = TYPE_RE.match(re.sub(r"--[^\n]*", "", item).strip())
        if not match:
            continue
        name = match.group("name")
        data_type = normalize_type(match.group("type"))
        rest = match.group("rest")
        columns.append({"name": name, "type": data_type, "rest": rest})
    for column in columns:
        column["is_pk"] = bool(re.search(r"PRIMARY\s+KEY", column["rest"], re.I)) or column["name"] in table_pk_cols
    tables[table] = columns

# Include columns introduced after table creation.
for alter in alter_blocks:
    table, body = alter.group(1), alter.group(2)
    if table not in tables:
        continue
    for added in re.finditer(
        r"ADD\s+COLUMN\s+([a-zA-Z_][\w]*)\s+(DOUBLE\s+PRECISION|TIMESTAMPTZ|SMALLINT|BIGINT|INTEGER|INT|BOOLEAN|UUID|JSONB?|DATE|TEXT\[\]|TEXT|CHAR\s*\(\s*\d+\s*\)|VARCHAR\s*\(\s*\d+\s*\)|NUMERIC\s*\(\s*\d+\s*,\s*\d+\s*\))([^,;]*)",
        body,
        re.I,
    ):
        name, data_type, rest = added.groups()
        if not any(c["name"] == name for c in tables[table]):
            tables[table].append({
                "name": name,
                "type": normalize_type(data_type),
                "rest": rest,
                "is_pk": False,
            })

lines = [
    "# CollieAI Data Dictionary",
    "",
    "Tables are arranged alphabetically. Fields within each table follow their order in `collieAI.sql`.",
    "",
]
for table in sorted(tables, key=str.lower):
    lines.extend([
        f"## `{table}`",
        "",
        f"**Purpose:** {purpose(table)}",
        "",
        "| Field Name | Data Type | Data Format | Field Size | Key / Constraints | Required | Description | Example |",
        "|---|---|---|---|---|---|---|---|",
    ])
    for col in tables[table]:
        name, data_type, rest = col["name"], col["type"], col["rest"]
        fmt, size = format_and_size(data_type)
        fk = foreign_keys.get((table, name))
        constraints = []
        if col["is_pk"]: constraints.append("Primary key")
        if re.search(r"GENERATED\s+ALWAYS\s+AS\s+IDENTITY", rest, re.I): constraints.append("Identity")
        if fk: constraints.append(f"Foreign key → `{fk}`")
        if re.search(r"\bUNIQUE\b", rest, re.I): constraints.append("Unique")
        default = re.search(r"\bDEFAULT\s+(.+?)(?=\s+(?:NOT\s+NULL|UNIQUE|PRIMARY|CHECK|REFERENCES)\b|$)", rest, re.I | re.S)
        if default: constraints.append("Default: `" + re.sub(r"\s+", " ", default.group(1).strip()) + "`")
        required = "Yes" if re.search(r"\bNOT\s+NULL\b", rest, re.I) or col["is_pk"] else "No"
        desc = description(name, table, col["is_pk"], fk)
        ex = example(name, data_type)
        values = [f"`{name}`", data_type, fmt, size, "; ".join(constraints) or "—", required, desc, f"`{ex}`"]
        values = [v.replace("|", "\\|").replace("\n", " ") for v in values]
        lines.append("| " + " | ".join(values) + " |")
    lines.append("")

OUTPUT.write_text("\n".join(lines), encoding="utf-8")
print(f"Generated {OUTPUT.name}: {len(tables)} tables, {sum(map(len, tables.values()))} fields")
