---
name: uml-sequence
description: Design UML sequence diagrams from concrete scenarios, including lifelines, messages, activations, alternatives, loops, optional paths, creation, and destruction.
---

# UML Sequence Diagram Skill

Start from one concrete scenario. Identify:
1. initiating actor;
2. boundary/interface if relevant;
3. control/application responsibility;
4. domain objects/services;
5. external systems;
6. responses and important alternative paths.

Messages must represent meaningful interactions. Do not create fake messages merely to make the diagram busy.

Use combined fragments deliberately:
- `alt` for alternatives;
- `opt` for optional behavior;
- `loop` for repetition;
- `par` for genuine parallel behavior.

Cross-check every message against the responsibilities and operations in the class/design model. If the sequence reveals a missing responsibility, update the model rather than hiding the inconsistency.
