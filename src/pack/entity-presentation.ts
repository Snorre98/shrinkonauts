import type { AssetDescriptor, FidelityClass } from "../assets";
import type {
  EntityPresentationConfig,
  PresentationConfig,
  PresentationRoleName,
  PresentationRoleConfig,
  PresentationSize,
  RoomEntityType,
} from "./types";

/** Legacy fallback; ADR-0072 and ADR-0074 replace it with per-role sizes. */
export const LEGACY_ENTITY_DISPLAY_SIZE = 36;

export interface DisplaySize {
  width: number;
  height: number;
}

export const DEFAULT_ROLE_DISPLAY: Record<PresentationRoleName, DisplaySize> = {
  player: { width: 28, height: 44 },
  npc: { width: 96, height: 96 },
  interactable: { width: 64, height: 64 },
  prop: { width: 48, height: 48 },
  scan: { width: 36, height: 36 },
  decor: { width: 36, height: 36 },
};

export const DEFAULT_ROLE_FIDELITY: Record<PresentationRoleName, FidelityClass> =
  {
    player: "world-2x",
    npc: "hero-1x",
    interactable: "hero-1x",
    prop: "hero-1x",
    scan: "ui-1x",
    decor: "world-2x",
  };

export const DEFAULT_ROLE_BY_ENTITY_TYPE: Partial<
  Record<RoomEntityType, PresentationRoleName>
> = {
  agent: "npc",
  prop: "prop",
  gate: "interactable",
  puzzleGate: "interactable",
  receptor: "interactable",
  pulseSource: "interactable",
  scanTarget: "scan",
  decor: "decor",
};

export interface ResolvedEntityDisplay {
  width: number;
  height: number;
  fidelity?: FidelityClass;
  role?: PresentationRoleName;
}

export function presentationSizeToDisplay(
  size: PresentationSize | undefined,
): DisplaySize | null {
  if (!size) return null;
  if (Array.isArray(size)) {
    return { width: size[0], height: size[1] };
  }
  return { width: size.width, height: size.height };
}

export function inferEntityRole(
  type: RoomEntityType,
  defaultRoles: PresentationConfig["defaultRoles"] | undefined,
): PresentationRoleName | null {
  const override = defaultRoles?.[type];
  if (override === "none") return null;
  if (override) return override;
  return DEFAULT_ROLE_BY_ENTITY_TYPE[type] ?? null;
}

function roleDisplay(
  role: PresentationRoleName,
  presentation: PresentationConfig | undefined,
): { display: DisplaySize; fidelity?: FidelityClass } {
  const configured: PresentationRoleConfig | undefined =
    presentation?.roles?.[role];
  return {
    display:
      presentationSizeToDisplay(configured?.display) ??
      DEFAULT_ROLE_DISPLAY[role],
    fidelity: configured?.fidelity ?? DEFAULT_ROLE_FIDELITY[role],
  };
}

/**
 * Resolve the visual display size for one entity.
 *
 * Precedence (ADR-0074):
 *   1. entity presentation.display
 *   2. explicit entity role, or an inferred role when the pack declares a role
 *      policy
 *   3. asset manifest display
 *   4. the legacy 36×36 fallback
 *
 * A pack with no role policy keeps the existing 36×36 behaviour even when the
 * entity type is `agent` or `prop`; this is what makes the contract opt-in.
 */
export function resolveEntityDisplay(options: {
  entity: {
    type: RoomEntityType;
    presentation?: EntityPresentationConfig;
  };
  asset?: Pick<AssetDescriptor, "display" | "fidelity">;
  presentation?: PresentationConfig;
}): ResolvedEntityDisplay {
  const { entity, asset, presentation } = options;

  const explicitDisplay = presentationSizeToDisplay(
    entity.presentation?.display,
  );
  if (explicitDisplay) {
    return {
      ...explicitDisplay,
      fidelity: asset?.fidelity ?? "hero-1x",
      ...(entity.presentation?.role
        ? { role: entity.presentation.role }
        : {}),
    };
  }

  const packHasRolePolicy = Boolean(
    presentation?.roles || presentation?.defaultRoles,
  );
  const role =
    entity.presentation?.role ??
    (packHasRolePolicy
      ? inferEntityRole(entity.type, presentation?.defaultRoles)
      : null);

  if (role) {
    const resolved = roleDisplay(role, presentation);
    return {
      width: resolved.display.width,
      height: resolved.display.height,
      fidelity: resolved.fidelity,
      role,
    };
  }

  if (asset?.display) {
    return {
      width: asset.display.width,
      height: asset.display.height,
      ...(asset.fidelity ? { fidelity: asset.fidelity } : {}),
    };
  }

  return {
    width: LEGACY_ENTITY_DISPLAY_SIZE,
    height: LEGACY_ENTITY_DISPLAY_SIZE,
    ...(asset?.fidelity ? { fidelity: asset.fidelity } : {}),
  };
}
