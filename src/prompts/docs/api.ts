export const API_PROMPT = `
Generate **API Documentation** in Markdown. Document the public interface of this project:

For REST/GraphQL APIs:
- **Endpoint** — Method + Path
- **Description** — What it does
- **Request** — Body/params/query with types
- **Response** — Response structure with types
- **Errors** — Possible error codes
- **Business Rules** — Rules that apply

For CLI tools:
- **Command** — Command name and syntax
- **Options/Flags** — Available options with descriptions
- **Examples** — Usage examples
- **Behavior** — What it does step by step

For libraries:
- **Public API** — Exported functions/classes and their signatures
- **Parameters** — Types and descriptions
- **Return values** — What is returned
- **Examples** — Usage patterns visible in code

ONLY document endpoints/commands/APIs that are explicitly defined in the code you can see.
Do NOT invent endpoints or parameters that don't exist.
`.trim();
