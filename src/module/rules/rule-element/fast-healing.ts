import { ActorType } from "@actor/data";
import { ItemPF2e } from "@item";
import { LocalizePF2e } from "@system/localize";
import { tupleHasValue, objectHasKey, localizeList } from "@util";
import { RuleElementPF2e, RuleElementData, RuleElementSource } from ".";

/**
 * Rule element to implement fast healing and regeneration.
 * Creates a chat card every round of combat.
 * @category RuleElement
 */
class FastHealingRuleElement extends RuleElementPF2e {
    static override validActorTypes: ActorType[] = ["character", "npc", "familiar"];

    constructor(data: FastHealingSource, item: Embedded<ItemPF2e>) {
        super(data, item);

        this.data.deactivatedBy = data.deactivatedBy ?? [];

        const type = this.resolveInjectedProperties(data.type) || "fast-healing";
        if (!tupleHasValue(["fast-healing", "regeneration"] as const, type)) {
            this.ignored = true;
            console.warn("PF2e System | FastHealing only supports fast-healing or regeneration types");
            return;
        }

        this.data.type = type;
    }

    get details() {
        if (this.data.details) {
            return game.i18n.localize(this.data.details);
        }

        if (this.data.deactivatedBy.length) {
            const typesArr = this.data.deactivatedBy.map((type) =>
                objectHasKey(CONFIG.PF2E.weaknessTypes, type)
                    ? game.i18n.localize(CONFIG.PF2E.weaknessTypes[type])
                    : type
            );

            const types = localizeList(typesArr);
            return game.i18n.format("PF2E.Encounter.Broadcast.FastHealing.DeactivatedBy", { types });
        }

        return null;
    }

    /** Refresh the actor's temporary hit points at the start of its turn */
    override onTurnStart(): void {
        if (this.ignored) return;

        const value = this.resolveValue(this.data.value);
        if (typeof value !== "number") {
            console.warn("PF2e System | Healing requires a non-zero value field or a formula field");
            return;
        }

        const roll = new Roll(`${value}`).evaluate({ async: false });
        const { FastHealingLabel, RegenerationLabel } = LocalizePF2e.translations.PF2E.Encounter.Broadcast.FastHealing;
        const preFlavor = game.i18n.localize(this.data.type === "fast-healing" ? FastHealingLabel : RegenerationLabel);
        const details = this.details;
        const postFlavor = details ? `<div data-visibility="owner">${details}</div>` : "";
        const flavor = `${preFlavor}${postFlavor}`;
        const rollMode = this.actor.hasPlayerOwner ? "publicroll" : game.settings.get("core", "rollMode");
        ChatMessage.createDocuments([{ flavor, type: CONST.CHAT_MESSAGE_TYPES.ROLL, roll }], { rollMode });
    }
}

interface FastHealingRuleElement extends RuleElementPF2e {
    data: FastHealingData;
}

interface FastHealingData extends RuleElementData {
    type: "fast-healing" | "regeneration";
    details?: string;
    deactivatedBy: string[];
}

interface FastHealingSource extends RuleElementSource {
    type?: "fast-healing" | "regeneration";
    details?: string;
    deactivatedBy?: string[];
}

export { FastHealingRuleElement as HealingRuleElement };
