# Cursor UML Modeling Pack

This pack is designed to help Cursor Agent analyze requirements, design UML models, generate PlantUML, and review diagrams for semantic correctness.

## Installation

Copy the `.cursor` directory into the root of your project:

```text
your-project/
├── .cursor/
│   ├── rules/
│   ├── skills/
│   └── commands/
└── ...
```

Cursor project rules use `.mdc` files under `.cursor/rules`. Skills use `SKILL.md` files in their skill directories.

## Recommended use

For a new project, ask Cursor Agent:

> Analyse this project and its requirements. Do not code yet. Apply the UML modeling workflow. Identify the actors, use cases, domain concepts, responsibilities and the UML diagrams that should be produced. Clearly separate facts, assumptions and open questions.

Then ask for the individual diagrams.

For an existing design:

> Review the current UML conception before I modify the code. Use the UML review skill. Identify semantic errors, incorrect relationships, unjustified cardinalities, missing concepts and inconsistencies between diagrams. Do not code yet.

## Important

Rules guide the agent; they do not make the model infallible. Always validate important business assumptions with the project requirements.
