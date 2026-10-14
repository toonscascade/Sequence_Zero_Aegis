"""
Identity & Look-Alike Name Rules — AegisShield
================================================
Implements Social & App identity matching and Bonus Credit (5–10 pts):
1. RapidFuzz Token & Levenshtein similarity against Brand Twin.
2. Look-alike name variation detection:
   - Character swaps (e.g. 0 -> o, 1 -> l, rn -> m, vv -> w)
   - Added deceptive words ("Official", "Support", "Verify", "Helpdesk", "Care")
   - Spacing, hyphen, and underscore mutations
3. Official asset exclusion check ("official accounts should not be flagged")
"""

import re
from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz


LOOKALIKE_CHAR_SWAPS = {
    "0": "o",
    "1": "l",
    "l": "i",
    "5": "s",
    "8": "b",
    "@": "a",
    "4": "a",
    "3": "e",
    "rn": "m",
    "vv": "w",
}

SUSPICIOUS_KEYWORD_ADDITIONS = [
    "official",
    "support",
    "helpdesk",
    "help",
    "care",
    "verify",
    "verified",
    "security",
    "portal",
    "customercare",
    "service",
    "desk",
    "login",
    "auth",
]


def normalize_handle(handle: str) -> str:
    """Normalize handle by stripping @ and lowercasing."""
    if not handle:
        return ""
    h = handle.strip().lower()
    return h[1:] if h.startswith("@") else h


def clean_text_separators(text: str) -> str:
    """Remove dots, underscores, and hyphens to detect spacing tricks."""
    return re.sub(r"[._\-\s]+", "", text.lower())


def check_lookalike_variations(candidate: str, target: str) -> Dict[str, Any]:
    """
    Detects bonus look-alike variants:
    - Character substitutions (leetspeak / confusable characters) -> CHAR_SWAP
    - Added words (Official, Support, etc.) -> ADDED_WORD
    - Spacing / separator mutations -> SPACING_CHANGE
    """
    c_norm = candidate.lower()
    t_norm = target.lower()
    
    details = []
    types = []
    has_lookalike = False

    # 1. Spacing / separator trick: "apex.bank" or "apex_bank" vs "apexbank"
    c_clean = clean_text_separators(c_norm)
    t_clean = clean_text_separators(t_norm)
    if c_clean == t_clean and c_norm != t_norm:
        has_lookalike = True
        types.append("SPACING_CHANGE")
        details.append("Identical name with modified spacing/separators")

    # 2. Leetspeak / Character swaps: e.g. "apexb0nk" -> "apexbank"
    for candidate_sub in [c_norm.replace("0", "a"), c_norm.replace("0", "o")]:
        substituted = candidate_sub
        for char, rep in LOOKALIKE_CHAR_SWAPS.items():
            if char in substituted:
                substituted = substituted.replace(char, rep)
        if clean_text_separators(substituted) == t_clean and c_norm != t_norm:
            has_lookalike = True
            if "CHAR_SWAP" not in types:
                types.append("CHAR_SWAP")
                details.append("Character swap detected (e.g., 0/a, 0/o, 1/l, rn/m)")
            break

    # 3. Added deceptive words: e.g. "apexbank_official" or "apexbank_support"
    for word in SUSPICIOUS_KEYWORD_ADDITIONS:
        if word in c_norm and word not in t_norm:
            # Check if remaining part matches the brand
            remainder = c_norm.replace(word, "")
            remainder_clean = clean_text_separators(remainder)
            if remainder_clean == t_clean or fuzz.ratio(remainder_clean, t_clean) > 80:
                has_lookalike = True
                types.append("ADDED_WORD")
                details.append(f"Deceptive keyword addition detected: '{word}'")
                break

    # 4. Compound check: Added word + Character swap (e.g. apexb@nk_support or apexb0nk_support)
    if "ADDED_WORD" in types and "CHAR_SWAP" not in types:
        for word in SUSPICIOUS_KEYWORD_ADDITIONS:
            if word in c_norm and word not in t_norm:
                rem = c_norm.replace(word, "")
                for rem_sub in [rem.replace("0", "a"), rem.replace("0", "o")]:
                    temp_rem = rem_sub
                    for char, rep in LOOKALIKE_CHAR_SWAPS.items():
                        temp_rem = temp_rem.replace(char, rep)
                    if clean_text_separators(temp_rem) == t_clean:
                        types.append("CHAR_SWAP")
                        details.append("Character swap detected within compound variation")
                        break

    return {
        "is_lookalike": has_lookalike,
        "types": types,
        "details": details
    }


def evaluate_social_identity(
    candidate_handle: str,
    candidate_name: str,
    brand_name: str,
    official_handles: List[str],
    allowlist: Optional[List[str]] = None,
) -> Dict[str, Any]:
    """
    Evaluates Social Profile identity against the Brand Twin.
    Strictly enforces official asset exclusion.
    """
    allowlist = allowlist or []
    norm_candidate = normalize_handle(candidate_handle)
    norm_officials = [normalize_handle(h) for h in official_handles]
    norm_allowlist = [normalize_handle(h) for h in allowlist]

    # --- CRITICAL RULE: Official Exclusion Gate ---
    if norm_candidate in norm_officials:
        return {
            "is_official": True,
            "is_allowlisted": False,
            "score": 0.0,
            "reason_codes": ["OFFICIAL_ACCOUNT_VERIFIED"],
            "signals": [{
                "code": "OFFICIAL_ACCOUNT_VERIFIED",
                "description": f"Verified official brand account: @{norm_candidate}",
                "severity": "safe"
            }]
        }

    # Allowlisted partner or fan assets
    if norm_candidate in norm_allowlist:
        return {
            "is_official": False,
            "is_allowlisted": True,
            "score": 10.0,
            "reason_codes": ["ALLOWLISTED_PARTNER_OR_FAN"],
            "signals": [{
                "code": "ALLOWLISTED_PARTNER_OR_FAN",
                "description": f"Account @{norm_candidate} is registered on the authorized allowlist.",
                "severity": "safe"
            }]
        }

    # --- Candidate similarity scoring ---
    signals = []
    reason_codes = []

    # 1. Fuzzy match against brand name & official handles
    handle_sim = max([fuzz.ratio(norm_candidate, h) for h in norm_officials] or [0])
    name_sim = fuzz.token_set_ratio(candidate_name.lower(), brand_name.lower()) if candidate_name else 0

    max_sim = max(handle_sim, name_sim)

    # 2. Look-alike analysis (Bonus 5-10 pts)
    targets_to_check = [brand_name] + norm_officials
    # Also extract short brand root (e.g. 'Apex Bank' from 'Apex Global Bank')
    if " " in brand_name:
        parts = brand_name.split()
        if len(parts) >= 2:
            targets_to_check.append(f"{parts[0]} {parts[-1]}")
            targets_to_check.append(f"{parts[0]}{parts[-1]}")
            targets_to_check.append(parts[0])

    lookalike_info = {"is_lookalike": False, "types": [], "details": []}
    for tgt in targets_to_check:
        info = check_lookalike_variations(norm_candidate, tgt)
        if not info["is_lookalike"] and candidate_name:
            info = check_lookalike_variations(candidate_name, tgt)
        if info["is_lookalike"]:
            lookalike_info["is_lookalike"] = True
            for t in info.get("types", []):
                if t not in lookalike_info["types"]:
                    lookalike_info["types"].append(t)
            for d in info.get("details", []):
                if d not in lookalike_info["details"]:
                    lookalike_info["details"].append(d)

    if lookalike_info["is_lookalike"]:
        reason_codes.append("LOOKALIKE_NAME_DETECTED")
        for m_type in lookalike_info.get("types", []):
            code = f"LOOKALIKE_{m_type}"
            if code not in reason_codes:
                reason_codes.append(code)
                signals.append({
                    "code": code,
                    "description": f"Look-alike mutation ({m_type}): {', '.join(lookalike_info['details'])}",
                    "severity": "high"
                })

        signals.append({
            "code": "LOOKALIKE_NAME_DETECTED",
            "description": f"Look-alike name variation: {', '.join(lookalike_info['details'])}",
            "severity": "high"
        })
        # Boost similarity score if explicit look-alike tactic found
        max_sim = max(max_sim, 85.0)

    if max_sim >= 75.0:
        reason_codes.append("NAME_IMPERSONATION")
        signals.append({
            "code": "NAME_IMPERSONATION",
            "description": f"Profile name or handle shares {max_sim:.1f}% similarity with official brand identity.",
            "severity": "high" if max_sim >= 85 else "medium"
        })

    return {
        "is_official": False,
        "is_allowlisted": False,
        "score": float(max_sim),
        "handle_similarity": float(handle_sim),
        "name_similarity": float(name_sim),
        "lookalike": lookalike_info,
        "reason_codes": reason_codes,
        "signals": signals
    }
