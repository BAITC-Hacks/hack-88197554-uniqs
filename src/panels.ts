// Реестр панелей: PanelId → компонент. Каждая фича заменяет свой Panel.tsx,
// регистрация новой панели — одна строка здесь (и PanelId в src/lib/types.ts).

import type { ComponentType } from "react";
import type { PanelId, PanelProps } from "@/lib/types";
import CharacterPanel from "@/features/character/Panel";
import QuestsPanel from "@/features/character/QuestsPanel";
import MentorPanel from "@/features/mentor/Panel";
import OfficePanel from "@/features/office/Panel";
import VenuePanel from "@/features/venues/Panel";
import SoonPanel from "@/features/hud/SoonPanel";

export const PANELS: Record<PanelId, ComponentType<PanelProps>> = {
  character: CharacterPanel,
  quests: QuestsPanel,
  mentor: MentorPanel,
  office: OfficePanel,
  venue: VenuePanel,
  soon: SoonPanel,
};
