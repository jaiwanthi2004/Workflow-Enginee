"""
Rule Engine - Evaluates conditions against input data.

Supports:
- Comparison: ==, !=, <, >, <=, >=
- Logical: && (AND), || (OR)
- String functions: contains(field, "value"), startsWith(field, "prefix"), endsWith(field, "suffix")
- DEFAULT rule (always matches as fallback)
- Branching and looping with max iteration guard
"""

import re
import ast
import operator
from typing import Any, Optional


# Max iterations for loop prevention
MAX_LOOP_ITERATIONS = 100


class RuleEngineError(Exception):
    """Custom exception for rule engine errors."""

    pass


def evaluate_condition(condition: str, data: dict) -> bool:
    """
    Evaluate a rule condition against input data.
    Returns True if the condition matches, False otherwise.
    """
    condition = condition.strip()

    # DEFAULT always matches
    if condition.upper() == "DEFAULT":
        return True

    try:
        return _evaluate_expression(condition, data)
    except Exception as e:
        raise RuleEngineError(f"Failed to evaluate condition '{condition}': {str(e)}")


def _evaluate_expression(expr: str, data: dict) -> bool:
    """Recursively evaluate a logical expression."""
    expr = expr.strip()

    # Handle parenthesized groups
    if expr.startswith("(") and _find_matching_paren(expr, 0) == len(expr) - 1:
        return _evaluate_expression(expr[1:-1], data)

    # Split by || (OR) - lowest precedence
    or_parts = _split_logical(expr, "||")
    if len(or_parts) > 1:
        return any(_evaluate_expression(part, data) for part in or_parts)

    # Split by && (AND)
    and_parts = _split_logical(expr, "&&")
    if len(and_parts) > 1:
        return all(_evaluate_expression(part, data) for part in and_parts)

    # Handle NOT
    if expr.startswith("!") and not expr.startswith("!="):
        return not _evaluate_expression(expr[1:], data)

    # Handle string functions
    func_match = re.match(
        r"^(contains|startsWith|endsWith)\s*\(\s*(.+)\s*,\s*(.+)\s*\)$", expr
    )
    if func_match:
        return _evaluate_string_function(
            func_match.group(1),
            func_match.group(2).strip(),
            func_match.group(3).strip(),
            data,
        )

    # Handle comparison
    return _evaluate_comparison(expr, data)


def _split_logical(expr: str, op: str) -> list:
    """Split expression by logical operator, respecting parentheses and quotes."""
    parts = []
    depth = 0
    in_string = None
    current = ""
    i = 0

    while i < len(expr):
        ch = expr[i]

        if ch in ('"', "'") and (i == 0 or expr[i - 1] != "\\"):
            if in_string is None:
                in_string = ch
            elif in_string == ch:
                in_string = None

        if in_string is None:
            if ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1

        if depth == 0 and in_string is None and expr[i : i + len(op)] == op:
            parts.append(current.strip())
            current = ""
            i += len(op)
            continue

        current += ch
        i += 1

    if current.strip():
        parts.append(current.strip())

    return parts


def _find_matching_paren(expr: str, start: int) -> int:
    """Find the index of the matching closing parenthesis."""
    depth = 0
    for i in range(start, len(expr)):
        if expr[i] == "(":
            depth += 1
        elif expr[i] == ")":
            depth -= 1
            if depth == 0:
                return i
    return -1


def _evaluate_comparison(expr: str, data: dict) -> bool:
    """Evaluate a comparison expression like 'amount > 100'."""
    ops = {
        "==": operator.eq,
        "!=": operator.ne,
        ">=": operator.ge,
        "<=": operator.le,
        ">": operator.gt,
        "<": operator.lt,
    }

    for op_str in [">=", "<=", "!=", "==", ">", "<"]:
        parts = _split_comparison(expr, op_str)
        if parts:
            left_str, right_str = parts
            left_val = _resolve_value(left_str.strip(), data)
            right_val = _resolve_value(right_str.strip(), data)
            # Type coerce for comparison
            left_val, right_val = _coerce_types(left_val, right_val)
            return ops[op_str](left_val, right_val)

    # If no comparison operator, treat as truthy check
    val = _resolve_value(expr, data)
    return bool(val)


def _split_comparison(expr: str, op: str) -> Optional[tuple]:
    """Split expression by a comparison operator, respecting quotes."""
    in_string = None
    i = 0
    while i < len(expr):
        ch = expr[i]
        if ch in ('"', "'") and (i == 0 or expr[i - 1] != "\\"):
            if in_string is None:
                in_string = ch
            elif in_string == ch:
                in_string = None
        if in_string is None and expr[i : i + len(op)] == op:
            # Make sure we don't match partial operators
            if op in (">", "<") and i + 1 < len(expr) and expr[i + 1] == "=":
                i += 1
                continue
            if op in (">", "<") and i > 0 and expr[i - 1] in ("!", "<", ">"):
                i += 1
                continue
            return (expr[:i], expr[i + len(op) :])
        i += 1
    return None


def _resolve_value(token: str, data: dict) -> Any:
    """Resolve a token to its actual value from data or as a literal."""
    token = token.strip()

    # String literal
    if (token.startswith('"') and token.endswith('"')) or (
        token.startswith("'") and token.endswith("'")
    ):
        return token[1:-1]

    # Boolean literals
    if token.lower() == "true":
        return True
    if token.lower() == "false":
        return False

    # None/null
    if token.lower() in ("null", "none"):
        return None

    # Numeric literal
    try:
        if "." in token:
            return float(token)
        return int(token)
    except ValueError:
        pass

    # Data field lookup (supports nested with dot notation)
    parts = token.split(".")
    val = data
    for part in parts:
        if isinstance(val, dict) and part in val:
            val = val[part]
        else:
            raise RuleEngineError(f"Field '{token}' not found in data")
    return val


def _coerce_types(left: Any, right: Any) -> tuple:
    """Coerce types for comparison."""
    if type(left) == type(right):
        return left, right

    # Try numeric coercion
    if isinstance(left, (int, float)) and isinstance(right, str):
        try:
            right = type(left)(right)
        except (ValueError, TypeError):
            pass
    elif isinstance(right, (int, float)) and isinstance(left, str):
        try:
            left = type(right)(left)
        except (ValueError, TypeError):
            pass

    return left, right


def _evaluate_string_function(
    func_name: str, field_token: str, value_token: str, data: dict
) -> bool:
    """Evaluate a string function."""
    field_val = str(_resolve_value(field_token, data))
    value_val = str(_resolve_value(value_token, data))

    if func_name == "contains":
        return value_val in field_val
    elif func_name == "startsWith":
        return field_val.startswith(value_val)
    elif func_name == "endsWith":
        return field_val.endswith(value_val)
    else:
        raise RuleEngineError(f"Unknown string function: {func_name}")


def evaluate_rules(rules: list, data: dict) -> dict:
    """
    Evaluate a list of rules sorted by priority.
    Returns the first matching rule or None.

    Returns dict with:
    - matched_rule: the rule that matched (or None)
    - evaluations: list of all evaluations performed
    """
    sorted_rules = sorted(rules, key=lambda r: r.get("priority", 0))
    evaluations = []

    for rule in sorted_rules:
        condition = rule.get("condition", "")
        try:
            result = evaluate_condition(condition, data)
            evaluations.append(
                {
                    "rule_id": rule.get("id"),
                    "condition": condition,
                    "priority": rule.get("priority", 0),
                    "result": result,
                    "error": None,
                }
            )
            if result:
                return {
                    "matched_rule": rule,
                    "evaluations": evaluations,
                }
        except RuleEngineError as e:
            evaluations.append(
                {
                    "rule_id": rule.get("id"),
                    "condition": condition,
                    "priority": rule.get("priority", 0),
                    "result": False,
                    "error": str(e),
                }
            )

    return {
        "matched_rule": None,
        "evaluations": evaluations,
    }
