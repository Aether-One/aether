export const BUSINESS_RULES_PROMPT = `
Generate a **Business Rules** document in Markdown. Analyze the code for business logic and document:

1. **Domain Rules** — Core rules that govern behavior (validations, constraints, conditions)
2. **Workflows** — Step-by-step flows (what happens when X is triggered)
3. **Permissions** — Access control rules (if any)
4. **Validations** — Input validation rules
5. **Edge Cases** — Special conditions or exceptions handled in the code

Format each rule with:
- **Rule ID** (BR-001, BR-002...)
- **Description** — What the rule says
- **Affected Modules** — Where it applies
- **Exceptions** — If any

If this is a library/tool rather than a business application, document behavioral rules and constraints instead.

ONLY document rules that are explicitly implemented in the code. Do NOT invent business rules.
Every rule you list must be traceable to specific code you can see in the context.
`.trim();
