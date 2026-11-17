---
name: plantuml
description: Generate clean, maintainable PlantUML from a validated UML model and validate the generated syntax and semantics.
---

# PlantUML Skill

Generate PlantUML only after the underlying UML decisions are settled.

Principles:
- favor readable source;
- use meaningful aliases only when they improve clarity;
- keep one diagram focused on one purpose;
- avoid styling that obscures semantics;
- use notes sparingly for assumptions;
- preserve domain terminology.

After generation, inspect the source for:
- incorrect arrow types;
- missing multiplicities;
- accidental duplicate elements;
- unsupported or inconsistent syntax;
- relationships that contradict the modeling decisions.

When the user asks for an image, prefer producing valid PlantUML source that can be rendered by their environment unless an image-generation tool is explicitly available and appropriate.
